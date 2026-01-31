import 'package:flutter/material.dart';
import '../../core/models/venda_recente.dart';
import '../utils/formatters.dart';

class DashboardVendasRecentes extends StatelessWidget {
  final List<VendaRecente> vendasRecentes;
  final VoidCallback? onVerTodas;

  const DashboardVendasRecentes({
    super.key,
    required this.vendasRecentes,
    this.onVerTodas,
  });

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
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Vendas Recentes',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                if (onVerTodas != null)
                  TextButton(
                    onPressed: onVerTodas,
                    child: const Text('Ver todas'),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            if (vendasRecentes.isEmpty)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Center(
                  child: Text(
                    'Nenhuma venda hoje',
                    style: TextStyle(color: Colors.grey),
                  ),
                ),
              )
            else
              ...vendasRecentes.map((venda) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey[50],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              venda.clienteNome ?? 'Cliente',
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 14,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              venda.produtoNome ?? 'Produto',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[600],
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              Formatters.formatDate(venda.data),
                              style: TextStyle(
                                fontSize: 11,
                                color: Colors.grey[500],
                              ),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        Formatters.formatCurrency(venda.valorTotal),
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Colors.green[700],
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

