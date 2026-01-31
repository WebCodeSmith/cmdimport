import 'package:flutter/material.dart';
import '../../core/services/auth_service.dart';
import '../../core/services/dashboard_service.dart';
import '../../core/models/historico_venda.dart';
import '../../shared/utils/formatters.dart';
import '../../shared/widgets/venda_detail_modal.dart';
import '../../shared/widgets/venda_item_card.dart';
import '../../shared/widgets/pagination_widget.dart';

class HistoricoScreen extends StatefulWidget {
  const HistoricoScreen({super.key});

  @override
  State<HistoricoScreen> createState() => _HistoricoScreenState();
}

class _HistoricoScreenState extends State<HistoricoScreen> {
  final _authService = AuthService();
  final _dashboardService = DashboardService();
  final _formKey = GlobalKey<FormState>();

  // Controllers
  final _clienteController = TextEditingController();
  final _dataInicioController = TextEditingController();
  final _dataFimController = TextEditingController();

  // Estado
  bool _loading = true;
  List<HistoricoVenda> _vendas = [];
  int _paginaAtual = 1;
  int _totalPaginas = 1;
  int _totalVendas = 0;
  final int _itensPorPagina = 10;
  String _ordenacao = 'mais-recente';

  @override
  void initState() {
    super.initState();
    _carregarHistorico();
  }

  @override
  void dispose() {
    _clienteController.dispose();
    _dataInicioController.dispose();
    _dataFimController.dispose();
    super.dispose();
  }

  Future<void> _carregarHistorico() async {
    final user = _authService.currentUser;
    if (user == null) return;

    setState(() {
      _loading = true;
    });

    try {
      final response = await _dashboardService.getHistoricoVendas(
        pagina: _paginaAtual,
        limite: _itensPorPagina,
        usuarioId: user.id,
        cliente: _clienteController.text.trim().isNotEmpty
            ? _clienteController.text.trim()
            : null,
        dataInicio: _dataInicioController.text.isNotEmpty
            ? _dataInicioController.text
            : null,
        dataFim: _dataFimController.text.isNotEmpty
            ? _dataFimController.text
            : null,
        ordenacao: _ordenacao,
      );

      if (response.success && response.data != null) {
        setState(() {
          _vendas = response.data!;
          if (response.paginacao != null) {
            _totalPaginas = response.paginacao!['totalPaginas'] as int? ?? 1;
            _totalVendas = response.paginacao!['total'] as int? ?? 0;
          }
        });
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(response.message ?? 'Erro ao carregar histórico')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro: $e')),
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

  void _limparFiltros() {
    _clienteController.clear();
    _dataInicioController.clear();
    _dataFimController.clear();
    _ordenacao = 'mais-recente';
    _paginaAtual = 1;
    _carregarHistorico();
  }

  void _mudarPagina(int pagina) {
    if (pagina >= 1 && pagina <= _totalPaginas) {
      setState(() {
        _paginaAtual = pagina;
      });
      _carregarHistorico();
    }
  }



  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Histórico de Vendas'),
      ),
      body: Column(
        children: [
          // Filtros
          Card(
            margin: const EdgeInsets.all(16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Filtros Avançados',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Filtros em grid responsivo
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final isWide = constraints.maxWidth > 600;
                        return isWide
                            ? Row(
                                children: [
                                  Expanded(
                                    child: TextFormField(
                                      controller: _clienteController,
                                      decoration: const InputDecoration(
                                        labelText: 'Nome do Cliente',
                                        hintText: 'Buscar por cliente...',
                                        border: OutlineInputBorder(),
                                        isDense: true,
                                      ),
                                      onFieldSubmitted: (_) => _carregarHistorico(),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: TextFormField(
                                      controller: _dataInicioController,
                                      decoration: const InputDecoration(
                                        labelText: 'Data Início',
                                        border: OutlineInputBorder(),
                                        isDense: true,
                                      ),
                                      readOnly: true,
                                      onTap: () async {
                                        final date = await showDatePicker(
                                          context: context,
                                          initialDate: DateTime.now(),
                                          firstDate: DateTime(2020),
                                          lastDate: DateTime.now(),
                                        );
                                        if (date != null) {
                                          _dataInicioController.text =
                                              date.toIso8601String().split('T')[0];
                                          _carregarHistorico();
                                        }
                                      },
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: TextFormField(
                                      controller: _dataFimController,
                                      decoration: const InputDecoration(
                                        labelText: 'Data Fim',
                                        border: OutlineInputBorder(),
                                        isDense: true,
                                      ),
                                      readOnly: true,
                                      onTap: () async {
                                        final date = await showDatePicker(
                                          context: context,
                                          initialDate: DateTime.now(),
                                          firstDate: DateTime(2020),
                                          lastDate: DateTime.now(),
                                        );
                                        if (date != null) {
                                          _dataFimController.text =
                                              date.toIso8601String().split('T')[0];
                                          _carregarHistorico();
                                        }
                                      },
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: DropdownButtonFormField<String>(
                                      value: _ordenacao,
                                      decoration: const InputDecoration(
                                        labelText: 'Ordenação',
                                        border: OutlineInputBorder(),
                                        isDense: true,
                                      ),
                                      items: const [
                                        DropdownMenuItem(
                                          value: 'mais-recente',
                                          child: Text('Mais Recente'),
                                        ),
                                        DropdownMenuItem(
                                          value: 'mais-antigo',
                                          child: Text('Mais Antigo'),
                                        ),
                                        DropdownMenuItem(
                                          value: 'maior-valor',
                                          child: Text('Maior Valor'),
                                        ),
                                        DropdownMenuItem(
                                          value: 'menor-valor',
                                          child: Text('Menor Valor'),
                                        ),
                                      ],
                                      onChanged: (value) {
                                        if (value != null) {
                                          setState(() {
                                            _ordenacao = value;
                                          });
                                          _carregarHistorico();
                                        }
                                      },
                                    ),
                                  ),
                                ],
                              )
                            : Column(
                                children: [
                                  TextFormField(
                                    controller: _clienteController,
                                    decoration: const InputDecoration(
                                      labelText: 'Nome do Cliente',
                                      hintText: 'Buscar por cliente...',
                                      border: OutlineInputBorder(),
                                      isDense: true,
                                    ),
                                    onFieldSubmitted: (_) => _carregarHistorico(),
                                  ),
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: TextFormField(
                                          controller: _dataInicioController,
                                          decoration: const InputDecoration(
                                            labelText: 'Data Início',
                                            border: OutlineInputBorder(),
                                            isDense: true,
                                          ),
                                          readOnly: true,
                                          onTap: () async {
                                            final date = await showDatePicker(
                                              context: context,
                                              initialDate: DateTime.now(),
                                              firstDate: DateTime(2020),
                                              lastDate: DateTime.now(),
                                            );
                                            if (date != null) {
                                              _dataInicioController.text =
                                                  date.toIso8601String().split('T')[0];
                                              _carregarHistorico();
                                            }
                                          },
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: TextFormField(
                                          controller: _dataFimController,
                                          decoration: const InputDecoration(
                                            labelText: 'Data Fim',
                                            border: OutlineInputBorder(),
                                            isDense: true,
                                          ),
                                          readOnly: true,
                                          onTap: () async {
                                            final date = await showDatePicker(
                                              context: context,
                                              initialDate: DateTime.now(),
                                              firstDate: DateTime(2020),
                                              lastDate: DateTime.now(),
                                            );
                                            if (date != null) {
                                              _dataFimController.text =
                                                  date.toIso8601String().split('T')[0];
                                              _carregarHistorico();
                                            }
                                          },
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  DropdownButtonFormField<String>(
                                    value: _ordenacao,
                                    decoration: const InputDecoration(
                                      labelText: 'Ordenação',
                                      border: OutlineInputBorder(),
                                      isDense: true,
                                    ),
                                    isExpanded: true,
                                    items: const [
                                      DropdownMenuItem(
                                        value: 'mais-recente',
                                        child: Text('Mais Recente'),
                                      ),
                                      DropdownMenuItem(
                                        value: 'mais-antigo',
                                        child: Text('Mais Antigo'),
                                      ),
                                      DropdownMenuItem(
                                        value: 'maior-valor',
                                        child: Text('Maior Valor'),
                                      ),
                                      DropdownMenuItem(
                                        value: 'menor-valor',
                                        child: Text('Menor Valor'),
                                      ),
                                    ],
                                    onChanged: (value) {
                                      if (value != null) {
                                        setState(() {
                                          _ordenacao = value;
                                        });
                                        _carregarHistorico();
                                      }
                                    },
                                  ),
                                ],
                              );
                      },
                    ),
                    const SizedBox(height: 12),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: _limparFiltros,
                        child: const Text('Limpar Filtros'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Lista de Vendas
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _vendas.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              '📊',
                              style: TextStyle(fontSize: 64, color: Colors.grey[400]),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              _clienteController.text.isNotEmpty ||
                                      _dataInicioController.text.isNotEmpty ||
                                      _dataFimController.text.isNotEmpty
                                  ? 'Nenhuma venda encontrada'
                                  : 'Nenhuma venda realizada',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _clienteController.text.isNotEmpty ||
                                      _dataInicioController.text.isNotEmpty ||
                                      _dataFimController.text.isNotEmpty
                                  ? 'Tente ajustar os filtros de busca'
                                  : 'Suas vendas aparecerão aqui quando você começar a vender',
                              style: TextStyle(color: Colors.grey[600]),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _carregarHistorico,
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: _vendas.length,
                          itemBuilder: (context, index) {
                            final venda = _vendas[index];
                            return VendaItemCard(
                              venda: venda,
                              onTap: () => VendaDetailModal.show(context, venda),
                            );
                          },
                        ),
                      ),
          ),

          // Paginação
          PaginationWidget(
            paginaAtual: _paginaAtual,
            totalPaginas: _totalPaginas,
            totalItens: _totalVendas,
            itensPorPagina: _itensPorPagina,
            onPageChanged: _mudarPagina,
          ),
        ],
      ),
    );
  }

}
