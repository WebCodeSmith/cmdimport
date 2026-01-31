import 'package:flutter/material.dart';
import '../../core/models/historico_venda.dart';
import '../utils/formatters.dart';

class VendaDetailModal extends StatelessWidget {
  final HistoricoVenda venda;

  const VendaDetailModal({
    super.key,
    required this.venda,
  });

  static void show(BuildContext context, HistoricoVenda venda) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (context, scrollController) => SingleChildScrollView(
          controller: scrollController,
          child: VendaDetailModal(venda: venda),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Detalhes da Venda',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close),
              ),
            ],
          ),
          const Divider(),
          const SizedBox(height: 16),
          _buildDetailRow('Cliente', venda.clienteNome),
          _buildDetailRow('Telefone', Formatters.formatPhone(venda.telefone)),
          _buildDetailRow('Endereço', venda.endereco),
          _buildDetailRow('Data', Formatters.formatDateFull(venda.createdAt)),
          _buildDetailRow('Forma de Pagamento', venda.formaPagamento),
          if (venda.observacoes != null && venda.observacoes!.isNotEmpty)
            _buildDetailRow('Observações', venda.observacoes!),
          const SizedBox(height: 16),
          const Text(
            'Produtos',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          ...venda.produtos.map((produto) {
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                title: Text(produto.produtoNome),
                subtitle: Text(
                  'Quantidade: ${produto.quantidade} x ${Formatters.formatCurrency(produto.precoUnitario)}',
                ),
                trailing: Text(
                  Formatters.formatCurrency(
                      produto.precoUnitario * produto.quantidade),
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            );
          }),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.green[50],
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Valor Total:',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  Formatters.formatCurrency(venda.valorTotal),
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.green[700],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              '$label:',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.grey[700],
              ),
            ),
          ),
          Expanded(
            child: Text(value),
          ),
        ],
      ),
    );
  }
}

