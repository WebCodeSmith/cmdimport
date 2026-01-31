class VendaRecente {
  final String id;
  final String data;
  final double valorTotal;
  final String? clienteNome;
  final String? produtoNome;
  final int? produtos;

  VendaRecente({
    required this.id,
    required this.data,
    required this.valorTotal,
    this.clienteNome,
    this.produtoNome,
    this.produtos,
  });

  factory VendaRecente.fromJson(Map<String, dynamic> json) {
    return VendaRecente(
      id: json['id'] as String? ?? json['vendaId'] as String? ?? '',
      data: json['data'] as String? ?? json['createdAt'] as String? ?? '',
      valorTotal: (json['valorTotal'] as num?)?.toDouble() ?? 0.0,
      clienteNome: json['clienteNome'] as String? ?? json['cliente'] as String?,
      produtoNome: json['produtoNome'] as String?,
      produtos: json['produtos'] as int?,
    );
  }
}

