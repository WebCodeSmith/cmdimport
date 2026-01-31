import 'package:flutter/material.dart';
import '../../core/models/produto.dart';
import '../widgets/produto_selection_dialogs.dart';
import '../widgets/barcode_scanner_screen.dart';

class ProdutoScannerHelper {
  /// Abre o scanner de código de barras e processa o resultado
  /// 
  /// Retorna o ID do produto selecionado ou null se cancelado
  static Future<String?> processarCodigoEscaneado({
    required BuildContext context,
    required String barcode,
    required List<Produto> produtos,
    required double Function(Produto) calcularPreco,
    String? produtoSelecionadoId,
  }) async {
    if (barcode.isEmpty) return null;

    // Buscar produtos com este código de barras
    final produtosComCodigo = produtos.where((p) => 
      p.quantidade > 0 && 
      (p.codigoBarras?.toLowerCase() == barcode.toLowerCase() ||
       p.imei?.toLowerCase() == barcode.toLowerCase())
    ).toList();

    if (produtosComCodigo.isEmpty) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Nenhum produto encontrado com o código: $barcode'),
            backgroundColor: Colors.orange,
          ),
        );
      }
      return null;
    }

    // Se houver apenas um produto, retornar diretamente
    if (produtosComCodigo.length == 1) {
      return produtosComCodigo.first.id;
    }

    // Se houver múltiplos produtos, agrupar por nome
    final produtosAgrupados = <String, List<Produto>>{};
    for (var produto in produtosComCodigo) {
      final nomeNormalizado = produto.nome.trim().toLowerCase();
      if (!produtosAgrupados.containsKey(nomeNormalizado)) {
        produtosAgrupados[nomeNormalizado] = [];
      }
      produtosAgrupados[nomeNormalizado]!.add(produto);
    }

    // Se todos os produtos têm o mesmo nome, mostrar modal de variações
    if (produtosAgrupados.length == 1) {
      final grupo = produtosAgrupados.values.first;
      final selectedVariationId = await showDialog<String>(
        context: context,
        builder: (context) => VariacoesProdutoDialog(
          nome: grupo.first.nome,
          produtos: grupo,
          calcularPreco: calcularPreco,
        ),
      );
      return selectedVariationId;
    } else {
      // Se há produtos com nomes diferentes, mostrar dialog de seleção normal
      final produtoEscolhido = await showDialog<String>(
        context: context,
        builder: (BuildContext dialogContext) {
          return ProdutoSelectionDialog(
            produtos: produtosComCodigo,
            produtoSelecionadoId: produtoSelecionadoId,
            calcularPreco: calcularPreco,
          );
        },
      );
      return produtoEscolhido;
    }
  }

  /// Abre o scanner e processa o código escaneado
  static Future<String?> abrirScanner({
    required BuildContext context,
    required List<Produto> produtos,
    required double Function(Produto) calcularPreco,
    String? produtoSelecionadoId,
  }) async {
    final barcode = await Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (context) => const BarcodeScannerScreen(),
      ),
    );

    if (barcode == null || barcode.isEmpty) return null;

    return await processarCodigoEscaneado(
      context: context,
      barcode: barcode,
      produtos: produtos,
      calcularPreco: calcularPreco,
      produtoSelecionadoId: produtoSelecionadoId,
    );
  }
}

