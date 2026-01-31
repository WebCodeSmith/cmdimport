class ProdutoVenda {
  String? produtoId;
  String nome;
  int quantidade;
  double precoUnitario;
  bool usarPrecoPersonalizado;
  double? precoPersonalizado;

  ProdutoVenda({
    this.produtoId,
    required this.nome,
    required this.quantidade,
    required this.precoUnitario,
    this.usarPrecoPersonalizado = false,
    this.precoPersonalizado,
  });
}

