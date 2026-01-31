import '../../core/models/produto_venda.dart';

class VendaHelper {
  /// Valida e prepara os produtos para envio
  static List<Map<String, dynamic>> prepararProdutos(List<ProdutoVenda> produtosVenda) {
    final produtosValidos = <Map<String, dynamic>>[];
    
    for (final pv in produtosVenda) {
      if (pv.produtoId == null || pv.quantidade <= 0) continue;

      produtosValidos.add({
        'produto': pv.produtoId!,
        'nome': pv.nome,
        'quantidade': pv.quantidade.toString(),
        'usarPrecoPersonalizado': pv.usarPrecoPersonalizado,
        'precoPersonalizado': pv.usarPrecoPersonalizado && pv.precoPersonalizado != null
            ? pv.precoPersonalizado!.toString()
            : null,
      });
    }
    
    return produtosValidos;
  }

  /// Parse de valor monetário de string
  static double? parseValorMonetario(String? valor) {
    if (valor == null || valor.isEmpty) return null;
    
    final parsed = double.tryParse(
      valor.replaceAll(RegExp(r'[^\d,]'), '').replaceAll(',', '.'),
    );
    
    return (parsed != null && parsed > 0) ? parsed : null;
  }

  /// Constrói o payload da venda
  static Map<String, dynamic> construirPayloadVenda({
    required String clienteNome,
    required String telefone,
    required String endereco,
    required List<Map<String, dynamic>> produtos,
    required String formaPagamento,
    required int usuarioId,
    required String tipoCliente,
    String? observacoes,
    String? valorPix,
    String? valorCartao,
    String? valorDinheiro,
  }) {
    final venda = <String, dynamic>{
      'clienteNome': clienteNome.trim(),
      'telefone': telefone.replaceAll(RegExp(r'\D'), ''),
      'endereco': endereco.trim(),
      'produtos': produtos,
      'formaPagamento': formaPagamento,
      'usuarioId': usuarioId,
      'tipoCliente': tipoCliente,
    };

    if (observacoes != null && observacoes.trim().isNotEmpty) {
      venda['observacoes'] = observacoes.trim();
    }

    final pix = parseValorMonetario(valorPix);
    if (pix != null) venda['valorPix'] = pix;

    final cartao = parseValorMonetario(valorCartao);
    if (cartao != null) venda['valorCartao'] = cartao;

    final dinheiro = parseValorMonetario(valorDinheiro);
    if (dinheiro != null) venda['valorDinheiro'] = dinheiro;

    return venda;
  }
}

