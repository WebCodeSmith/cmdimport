import 'package:flutter/material.dart';
import '../../core/models/venda_por_dia.dart';
import '../utils/formatters.dart';

class DashboardVendasChart extends StatelessWidget {
  final List<VendaPorDia> vendasPorDia;

  const DashboardVendasChart({
    super.key,
    required this.vendasPorDia,
  });

  double _getMaxVendas() {
    if (vendasPorDia.isEmpty) return 1;
    return vendasPorDia.map((v) => v.vendas.toDouble()).reduce((a, b) => a > b ? a : b);
  }

  double _getBarHeight(int vendas) {
    final max = _getMaxVendas();
    return max > 0 ? (vendas / max) * 100 : 0;
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Vendas dos Últimos 7 Dias',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ...vendasPorDia.map((dia) {
              final barHeight = _getBarHeight(dia.vendas);
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  children: [
                    SizedBox(
                      width: 40,
                      child: Text(
                        dia.dia,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: Colors.grey[600],
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Stack(
                        children: [
                          Container(
                            height: 32,
                            decoration: BoxDecoration(
                              color: Colors.grey[200],
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          FractionallySizedBox(
                            widthFactor: barHeight / 100,
                            child: Container(
                              height: 32,
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [Colors.blue[400]!, Colors.blue[600]!],
                                ),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              alignment: Alignment.centerRight,
                              padding: const EdgeInsets.only(right: 8),
                              child: dia.vendas > 0
                                  ? Text(
                                      '${dia.vendas}',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    )
                                  : null,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    SizedBox(
                      width: 80,
                      child: Text(
                        Formatters.formatCurrency(dia.receita),
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                        textAlign: TextAlign.right,
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}

