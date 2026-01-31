class Produto {
  final String id;
  final String nome;
  final double preco;
  final int quantidade;
  final double? valorAtacado;
  final double? valorVarejo;
  final double? valorRevendaEspecial;
  final String? imei;
  final String? codigoBarras;
  final String? cor;
  final String? descricao;

  Produto({
    required this.id,
    required this.nome,
    required this.preco,
    required this.quantidade,
    this.valorAtacado,
    this.valorVarejo,
    this.valorRevendaEspecial,
    this.imei,
    this.codigoBarras,
    this.cor,
    this.descricao,
  });

  factory Produto.fromJson(Map<String, dynamic> json) {
    // Parse seguro de strings que podem ser null ou vazias
    String? parseString(dynamic value) {
      if (value == null) return null;
      final str = value.toString().trim();
      return str.isEmpty ? null : str;
    }

    return Produto(
      id: json['id'].toString(),
      nome: json['nome'] as String,
      preco: (json['preco'] as num?)?.toDouble() ?? 0.0,
      quantidade: json['quantidade'] as int? ?? 0,
      valorAtacado: (json['valorAtacado'] as num?)?.toDouble(),
      valorVarejo: (json['valorVarejo'] as num?)?.toDouble(),
      valorRevendaEspecial: (json['valorRevendaEspecial'] as num?)?.toDouble(),
      imei: parseString(json['imei']),
      codigoBarras: parseString(json['codigoBarras']),
      cor: parseString(json['cor']),
      descricao: parseString(json['descricao']),
    );
  }
}

