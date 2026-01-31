class HistoricoVenda {
  final String vendaId;
  final String clienteNome;
  final String telefone;
  final String endereco;
  final String? observacoes;
  final String vendedorNome;
  final String vendedorEmail;
  final String createdAt;
  final String? fotoProduto;
  final String formaPagamento;
  final double? valorPix;
  final double? valorCartao;
  final double? valorDinheiro;
  final String? tipoCliente;
  final List<ProdutoVenda> produtos;
  final double valorTotal;

  HistoricoVenda({
    required this.vendaId,
    required this.clienteNome,
    required this.telefone,
    required this.endereco,
    this.observacoes,
    required this.vendedorNome,
    required this.vendedorEmail,
    required this.createdAt,
    this.fotoProduto,
    required this.formaPagamento,
    this.valorPix,
    this.valorCartao,
    this.valorDinheiro,
    this.tipoCliente,
    required this.produtos,
    required this.valorTotal,
  });

  factory HistoricoVenda.fromJson(Map<String, dynamic> json) {
    return HistoricoVenda(
      vendaId: json['vendaId'] as String? ?? json['id'] as String? ?? '',
      clienteNome: json['clienteNome'] as String,
      telefone: json['telefone'] as String,
      endereco: json['endereco'] as String,
      observacoes: json['observacoes'] as String?,
      vendedorNome: json['vendedorNome'] as String,
      vendedorEmail: json['vendedorEmail'] as String,
      createdAt: json['createdAt'] as String,
      fotoProduto: json['fotoProduto'] as String?,
      formaPagamento: json['formaPagamento'] as String,
      valorPix: (json['valorPix'] as num?)?.toDouble(),
      valorCartao: (json['valorCartao'] as num?)?.toDouble(),
      valorDinheiro: (json['valorDinheiro'] as num?)?.toDouble(),
      tipoCliente: json['tipoCliente'] as String?,
      produtos: (json['produtos'] as List<dynamic>?)
              ?.map((p) => ProdutoVenda.fromJson(p as Map<String, dynamic>))
              .toList() ??
          [],
      valorTotal: (json['valorTotal'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class ProdutoVenda {
  final int id;
  final int? produtoId;
  final String produtoNome;
  final int quantidade;
  final double precoUnitario;

  ProdutoVenda({
    required this.id,
    this.produtoId,
    required this.produtoNome,
    required this.quantidade,
    required this.precoUnitario,
  });

  factory ProdutoVenda.fromJson(Map<String, dynamic> json) {
    return ProdutoVenda(
      id: json['id'] as int,
      produtoId: json['produtoId'] as int?,
      produtoNome: json['produtoNome'] as String,
      quantidade: json['quantidade'] as int,
      precoUnitario: (json['precoUnitario'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

