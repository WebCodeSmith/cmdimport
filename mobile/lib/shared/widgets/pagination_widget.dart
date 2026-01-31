import 'package:flutter/material.dart';

class PaginationWidget extends StatelessWidget {
  final int paginaAtual;
  final int totalPaginas;
  final int totalItens;
  final int itensPorPagina;
  final Function(int) onPageChanged;

  const PaginationWidget({
    super.key,
    required this.paginaAtual,
    required this.totalPaginas,
    required this.totalItens,
    required this.itensPorPagina,
    required this.onPageChanged,
  });

  List<int> _getPaginas() {
    const maxPaginas = 5;
    if (totalPaginas <= maxPaginas) {
      return List.generate(totalPaginas, (i) => i + 1);
    }

    int inicio = (paginaAtual - maxPaginas ~/ 2).clamp(1, totalPaginas - maxPaginas + 1);
    int fim = (inicio + maxPaginas - 1).clamp(1, totalPaginas);

    return List.generate(fim - inicio + 1, (i) => inicio + i);
  }

  @override
  Widget build(BuildContext context) {
    if (totalPaginas <= 1) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            spreadRadius: 1,
            blurRadius: 4,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            'Mostrando ${((paginaAtual - 1) * itensPorPagina) + 1} a ${(paginaAtual * itensPorPagina).clamp(0, totalItens)} de $totalItens vendas',
            style: TextStyle(fontSize: 12, color: Colors.grey[600]),
          ),
          Row(
            children: [
              IconButton(
                onPressed: paginaAtual > 1
                    ? () => onPageChanged(paginaAtual - 1)
                    : null,
                icon: const Icon(Icons.chevron_left),
              ),
              ..._getPaginas().map((pagina) {
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: InkWell(
                    onTap: () => onPageChanged(pagina),
                    child: Container(
                      width: 36,
                      height: 36,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: pagina == paginaAtual
                            ? Colors.grey[900]
                            : Colors.white,
                        border: Border.all(
                          color: pagina == paginaAtual
                              ? Colors.grey[900]!
                              : Colors.grey[300]!,
                        ),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        pagina.toString(),
                        style: TextStyle(
                          color: pagina == paginaAtual
                              ? Colors.white
                              : Colors.grey[700],
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                );
              }),
              IconButton(
                onPressed: paginaAtual < totalPaginas
                    ? () => onPageChanged(paginaAtual + 1)
                    : null,
                icon: const Icon(Icons.chevron_right),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

