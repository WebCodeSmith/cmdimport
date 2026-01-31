import '../../core/models/dashboard_stats.dart';
import '../../core/models/venda_recente.dart';
import '../../core/models/venda_por_dia.dart';
import '../../core/models/produto_mais_vendido.dart';
import '../../core/models/historico_venda.dart';
import '../../core/models/venda_dia_data.dart';
import '../../core/models/produto_data.dart';

class DashboardDataHelper {
  /// Processa os dados do dashboard a partir das vendas
  static DashboardData processarDados({
    required List<HistoricoVenda> todasVendas,
    required List<HistoricoVenda> vendasHoje,
    required List<HistoricoVenda> vendasOntem,
    required List<HistoricoVenda> vendasSeteDias,
  }) {
    final receitaTotal = todasVendas.fold<double>(
        0, (acc, venda) => acc + venda.valorTotal);
    final receitaHoje = vendasHoje.fold<double>(
        0, (acc, venda) => acc + venda.valorTotal);
    final receitaOntem = vendasOntem.fold<double>(
        0, (acc, venda) => acc + venda.valorTotal);

    final stats = DashboardStats(
      vendasHoje: vendasHoje.length,
      vendasTotal: todasVendas.length,
      receitaHoje: receitaHoje,
      receitaTotal: receitaTotal,
      vendasOntem: vendasOntem.length,
      receitaOntem: receitaOntem,
    );

    // Vendas recentes (últimas 5)
    final vendasRecentes = vendasHoje.take(5).map((v) {
      return VendaRecente(
        id: v.vendaId,
        data: v.createdAt,
        valorTotal: v.valorTotal,
        clienteNome: v.clienteNome,
        produtoNome: v.produtos.isNotEmpty
            ? v.produtos.first.produtoNome
            : null,
        produtos: v.produtos.length,
      );
    }).toList();

    // Vendas por dia (últimos 7 dias)
    final hoje = DateTime.now();
    final hojeMidnight = DateTime(hoje.year, hoje.month, hoje.day);
    final vendasPorDiaMap = <String, VendaDiaData>{};
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    // Inicializar mapa com os últimos 7 dias
    for (int i = 6; i >= 0; i--) {
      final data = hojeMidnight.subtract(Duration(days: i));
      final dataStr = data.toIso8601String().split('T')[0];
      final diaSemana = dias[data.weekday % 7];

      vendasPorDiaMap[dataStr] = VendaDiaData(
        vendas: 0,
        receita: 0.0,
        diaSemana: diaSemana,
      );
    }

    // Preencher com dados reais
    for (final venda in vendasSeteDias) {
      final dataVenda = venda.createdAt.split('T')[0];
      if (vendasPorDiaMap.containsKey(dataVenda)) {
        final atual = vendasPorDiaMap[dataVenda]!;
        vendasPorDiaMap[dataVenda] = VendaDiaData(
          vendas: atual.vendas + 1,
          receita: atual.receita + venda.valorTotal,
          diaSemana: atual.diaSemana,
        );
      }
    }

    // Criar array ordenado
    final vendasPorDia = <VendaPorDia>[];
    for (int i = 6; i >= 0; i--) {
      final data = hojeMidnight.subtract(Duration(days: i));
      final dataStr = data.toIso8601String().split('T')[0];
      final dados = vendasPorDiaMap[dataStr];

      if (dados != null) {
        vendasPorDia.add(VendaPorDia(
          dia: dados.diaSemana,
          vendas: dados.vendas,
          receita: dados.receita,
        ));
      }
    }

    // Produtos mais vendidos
    final produtosMap = <String, ProdutoData>{};
    for (final venda in vendasSeteDias) {
      for (final produto in venda.produtos) {
        final nome = produto.produtoNome;
        final quantidade = produto.quantidade;
        final receita = produto.precoUnitario * quantidade;

        if (produtosMap.containsKey(nome)) {
          final atual = produtosMap[nome]!;
          produtosMap[nome] = ProdutoData(
            quantidade: atual.quantidade + quantidade,
            receita: atual.receita + receita,
          );
        } else {
          produtosMap[nome] = ProdutoData(
            quantidade: quantidade,
            receita: receita,
          );
        }
      }
    }

    final produtosMaisVendidos = produtosMap.entries
        .map((e) => ProdutoMaisVendido(
              nome: e.key,
              quantidade: e.value.quantidade,
              receita: e.value.receita,
            ))
        .toList()
      ..sort((a, b) => b.quantidade.compareTo(a.quantidade));

    return DashboardData(
      stats: stats,
      vendasRecentes: vendasRecentes,
      vendasPorDia: vendasPorDia,
      produtosMaisVendidos: produtosMaisVendidos.take(5).toList(),
    );
  }
}

class DashboardData {
  final DashboardStats stats;
  final List<VendaRecente> vendasRecentes;
  final List<VendaPorDia> vendasPorDia;
  final List<ProdutoMaisVendido> produtosMaisVendidos;

  DashboardData({
    required this.stats,
    required this.vendasRecentes,
    required this.vendasPorDia,
    required this.produtosMaisVendidos,
  });
}

