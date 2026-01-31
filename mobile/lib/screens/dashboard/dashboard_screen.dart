import 'package:flutter/material.dart';
import '../../core/services/auth_service.dart';
import '../../core/services/dashboard_service.dart';
import '../../core/models/dashboard_stats.dart';
import '../../core/models/historico_venda.dart';
import '../../shared/utils/formatters.dart';
import '../../shared/helpers/dashboard_data_helper.dart';
import '../../shared/widgets/dashboard_stat_card.dart';
import '../../shared/widgets/dashboard_vendas_chart.dart';
import '../../shared/widgets/dashboard_vendas_recentes.dart';
import '../../shared/widgets/dashboard_produtos_mais_vendidos.dart';
import '../../shared/widgets/app_drawer.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _authService = AuthService();
  final _dashboardService = DashboardService();
  
  bool _loading = true;
  DashboardData? _dashboardData;

  @override
  void initState() {
    super.initState();
    _carregarDados();
  }

  Future<void> _carregarDados() async {
    final user = _authService.currentUser;
    if (user == null) return;

    setState(() {
      _loading = true;
    });

    try {
      final agora = DateTime.now();
      final hoje = DateTime(agora.year, agora.month, agora.day);
      final hojeStr = hoje.toIso8601String().split('T')[0];

      final ontem = hoje.subtract(const Duration(days: 1));
      final ontemStr = ontem.toIso8601String().split('T')[0];

      final seteDiasAtras = hoje.subtract(const Duration(days: 6));
      final seteDiasAtrasStr = seteDiasAtras.toIso8601String().split('T')[0];

      // Buscar todas as vendas
      final responseTotal = await _dashboardService.getHistoricoVendas(
        usuarioId: user.id,
        limite: 1000,
      );

      // Buscar vendas de hoje
      final responseHoje = await _dashboardService.getHistoricoVendas(
        usuarioId: user.id,
        dataInicio: hojeStr,
        limite: 1000,
      );

      // Buscar vendas de ontem
      final responseOntem = await _dashboardService.getHistoricoVendas(
        usuarioId: user.id,
        dataInicio: ontemStr,
        dataFim: hojeStr,
        limite: 1000,
      );

      // Buscar vendas dos últimos 7 dias
      final responseSeteDias = await _dashboardService.getHistoricoVendas(
        usuarioId: user.id,
        dataInicio: seteDiasAtrasStr,
        limite: 1000,
      );

      if (responseTotal.success && responseTotal.data != null) {
        final todasVendas = responseTotal.data!;
        final vendasHoje = responseHoje.success && responseHoje.data != null
            ? responseHoje.data!
            : <HistoricoVenda>[];
        final vendasOntem = responseOntem.success && responseOntem.data != null
            ? responseOntem.data!
            : <HistoricoVenda>[];
        final vendasSeteDias = responseSeteDias.success &&
                responseSeteDias.data != null
            ? responseSeteDias.data!
            : <HistoricoVenda>[];

        _dashboardData = DashboardDataHelper.processarDados(
          todasVendas: todasVendas,
          vendasHoje: vendasHoje,
          vendasOntem: vendasOntem,
          vendasSeteDias: vendasSeteDias,
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao carregar dados: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await _authService.logout();
              if (mounted) {
                Navigator.of(context).pushReplacementNamed('/login');
              }
            },
          ),
        ],
      ),
      drawer: AppDrawer(
        currentRoute: '/dashboard',
        authService: _authService,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _carregarDados,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header
                    const Text(
                      'Visão Geral',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Acompanhe suas vendas e receitas',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey[600],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Cards de Estatísticas
                    if (_dashboardData != null) ...[
                      GridView.count(
                        crossAxisCount: 2,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                        childAspectRatio: 1.5,
                        children: [
                          DashboardStatCard(
                            title: 'Vendas Hoje',
                            value: _dashboardData!.stats.vendasHoje.toString(),
                            subtitle: 'vendas realizadas hoje',
                            color: Colors.blue,
                            icon: Icons.access_time,
                            crescimento: _dashboardData!.stats.getCrescimentoVendas(),
                          ),
                          DashboardStatCard(
                            title: 'Total de Vendas',
                            value: _dashboardData!.stats.vendasTotal.toString(),
                            subtitle: 'total de vendas',
                            color: Colors.green,
                            icon: Icons.bar_chart,
                          ),
                          DashboardStatCard(
                            title: 'Receita Hoje',
                            value: Formatters.formatCurrency(_dashboardData!.stats.receitaHoje),
                            subtitle: 'receita de hoje',
                            color: Colors.orange,
                            icon: Icons.attach_money,
                            crescimento: _dashboardData!.stats.getCrescimentoReceita(),
                          ),
                          DashboardStatCard(
                            title: 'Receita Total',
                            value: Formatters.formatCurrency(_dashboardData!.stats.receitaTotal),
                            subtitle: 'receita acumulada',
                            color: Colors.purple,
                            icon: Icons.account_balance_wallet,
                          ),
                        ],
                      ),
                      const SizedBox(height: 24),
                    ],

                    // Gráfico de Vendas dos Últimos 7 Dias
                    if (_dashboardData != null)
                      DashboardVendasChart(
                        vendasPorDia: _dashboardData!.vendasPorDia,
                      ),
                    const SizedBox(height: 24),

                    // Vendas Recentes
                    if (_dashboardData != null)
                      DashboardVendasRecentes(
                        vendasRecentes: _dashboardData!.vendasRecentes,
                        onVerTodas: () {
                          Navigator.pushNamed(context, '/historico');
                        },
                      ),
                    const SizedBox(height: 24),

                    // Produtos Mais Vendidos
                    if (_dashboardData != null)
                      DashboardProdutosMaisVendidos(
                        produtos: _dashboardData!.produtosMaisVendidos,
                      ),
                  ],
                ),
              ),
            ),
    );
  }

}

