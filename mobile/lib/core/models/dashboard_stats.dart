class DashboardStats {
  final int vendasHoje;
  final int vendasTotal;
  final double receitaHoje;
  final double receitaTotal;
  final int? vendasOntem;
  final double? receitaOntem;

  DashboardStats({
    required this.vendasHoje,
    required this.vendasTotal,
    required this.receitaHoje,
    required this.receitaTotal,
    this.vendasOntem,
    this.receitaOntem,
  });

  factory DashboardStats.fromJson(Map<String, dynamic> json) {
    return DashboardStats(
      vendasHoje: json['vendasHoje'] as int? ?? 0,
      vendasTotal: json['vendasTotal'] as int? ?? 0,
      receitaHoje: (json['receitaHoje'] as num?)?.toDouble() ?? 0.0,
      receitaTotal: (json['receitaTotal'] as num?)?.toDouble() ?? 0.0,
      vendasOntem: json['vendasOntem'] as int?,
      receitaOntem: (json['receitaOntem'] as num?)?.toDouble(),
    );
  }

  double getCrescimentoVendas() {
    if (vendasOntem == null || vendasOntem == 0) return 0;
    return ((vendasHoje - vendasOntem!) / vendasOntem!) * 100;
  }

  double getCrescimentoReceita() {
    if (receitaOntem == null || receitaOntem == 0) return 0;
    return ((receitaHoje - receitaOntem!) / receitaOntem!) * 100;
  }
}

