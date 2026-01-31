import 'package:flutter/material.dart';
import '../../core/models/produto.dart';
import '../utils/formatters.dart';

// Classe auxiliar para agrupar produtos
class ProdutoGrouped {
  final String nome;
  final List<Produto> produtos;
  final int totalQuantidade;

  ProdutoGrouped({
    required this.nome,
    required this.produtos,
    required this.totalQuantidade,
  });
}

// Dialog principal de seleção de produtos
class ProdutoSelectionDialog extends StatefulWidget {
  final List<Produto> produtos;
  final String? produtoSelecionadoId;
  final double Function(Produto) calcularPreco;

  const ProdutoSelectionDialog({
    super.key,
    required this.produtos,
    this.produtoSelecionadoId,
    required this.calcularPreco,
  });

  @override
  State<ProdutoSelectionDialog> createState() => _ProdutoSelectionDialogState();
}

class _ProdutoSelectionDialogState extends State<ProdutoSelectionDialog> {
  final _searchController = TextEditingController();
  List<ProdutoGrouped> _produtosAgrupados = [];

  @override
  void initState() {
    super.initState();
    _agruparProdutos();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _agruparProdutos() {
    final Map<String, List<Produto>> grupos = {};
    
    for (final produto in widget.produtos) {
      final nomeNormalizado = produto.nome.trim().toLowerCase();
      if (!grupos.containsKey(nomeNormalizado)) {
        grupos[nomeNormalizado] = [];
      }
      grupos[nomeNormalizado]!.add(produto);
    }

    _produtosAgrupados = grupos.entries.map((entry) {
      final produtos = entry.value;
      final totalQuantidade = produtos.fold<int>(
        0,
        (sum, p) => sum + p.quantidade,
      );
      return ProdutoGrouped(
        nome: produtos.first.nome,
        produtos: produtos,
        totalQuantidade: totalQuantidade,
      );
    }).toList();
  }

  void _filtrarProdutos(String query) {
    setState(() {
      if (query.isEmpty) {
        _agruparProdutos();
      } else {
        final produtosFiltrados = widget.produtos
            .where((produto) => produto.nome
                .toLowerCase()
                .contains(query.toLowerCase()))
            .toList();

        final Map<String, List<Produto>> grupos = {};
        for (final produto in produtosFiltrados) {
          final nomeNormalizado = produto.nome.trim().toLowerCase();
          if (!grupos.containsKey(nomeNormalizado)) {
            grupos[nomeNormalizado] = [];
          }
          grupos[nomeNormalizado]!.add(produto);
        }

        _produtosAgrupados = grupos.entries.map((entry) {
          final produtos = entry.value;
          final totalQuantidade = produtos.fold<int>(
            0,
            (sum, p) => sum + p.quantidade,
          );
          return ProdutoGrouped(
            nome: produtos.first.nome,
            produtos: produtos,
            totalQuantidade: totalQuantidade,
          );
        }).toList();
      }
    });
  }

  Future<void> _mostrarModalVariacoes(ProdutoGrouped grupo) async {
    if (grupo.produtos.length == 1) {
      Navigator.of(context).pop(grupo.produtos.first.id);
      return;
    }

    final produtoEscolhido = await showDialog<String>(
      context: context,
      builder: (context) => VariacoesProdutoDialog(
        nome: grupo.nome,
        produtos: grupo.produtos,
        calcularPreco: widget.calcularPreco,
      ),
    );

    if (produtoEscolhido != null && mounted) {
      Navigator.of(context).pop(produtoEscolhido);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Container(
        width: MediaQuery.of(context).size.width * 0.9,
        height: MediaQuery.of(context).size.height * 0.7,
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Título e busca
            Row(
              children: [
                const Text(
                  'Selecione um Produto',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Buscar produto...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
                fillColor: Colors.grey[100],
              ),
              onChanged: _filtrarProdutos,
            ),
            const SizedBox(height: 16),
            // Lista de produtos agrupados
            Expanded(
              child: _produtosAgrupados.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.search_off, size: 48, color: Colors.grey[400]),
                          const SizedBox(height: 16),
                          Text(
                            'Nenhum produto encontrado',
                            style: TextStyle(color: Colors.grey[600]),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      itemCount: _produtosAgrupados.length,
                      itemBuilder: (context, i) {
                        final grupo = _produtosAgrupados[i];
                        final primeiroProduto = grupo.produtos.first;
                        final preco = widget.calcularPreco(primeiroProduto);
                        final temMultiplos = grupo.produtos.length > 1;
                        final isSelected = grupo.produtos.any(
                          (p) => widget.produtoSelecionadoId == p.id,
                        );

                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          elevation: isSelected ? 4 : 1,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: BorderSide(
                              color: isSelected
                                  ? Colors.grey[900]!
                                  : Colors.grey[300]!,
                              width: isSelected ? 2 : 1,
                            ),
                          ),
                          child: ListTile(
                            title: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    grupo.nome,
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: isSelected
                                          ? Colors.grey[900]
                                          : Colors.black,
                                    ),
                                  ),
                                ),
                                if (temMultiplos)
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.blue[100],
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Text(
                                      '${grupo.produtos.length} variações',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.blue[700],
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const SizedBox(height: 4),
                                Text(
                                  'Qtd total: ${grupo.totalQuantidade}',
                                  style: TextStyle(
                                    color: Colors.grey[600],
                                    fontSize: 12,
                                  ),
                                ),
                                if (!temMultiplos) ...[
                                  if (primeiroProduto.imei != null)
                                    Text(
                                      'IMEI: ${primeiroProduto.imei}',
                                      style: TextStyle(
                                        color: Colors.grey[600],
                                        fontSize: 11,
                                      ),
                                    ),
                                  if (primeiroProduto.codigoBarras != null)
                                    Text(
                                      'Código: ${primeiroProduto.codigoBarras}',
                                      style: TextStyle(
                                        color: Colors.grey[600],
                                        fontSize: 11,
                                      ),
                                    ),
                                ],
                                Text(
                                  Formatters.formatCurrency(preco),
                                  style: TextStyle(
                                    color: Colors.green[700],
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                            trailing: isSelected
                                ? Icon(Icons.check_circle, color: Colors.grey[900])
                                : const Icon(Icons.radio_button_unchecked, color: Colors.grey),
                            onTap: () => _mostrarModalVariacoes(grupo),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

// Dialog de variações de produtos
class VariacoesProdutoDialog extends StatelessWidget {
  final String nome;
  final List<Produto> produtos;
  final double Function(Produto) calcularPreco;

  const VariacoesProdutoDialog({
    super.key,
    required this.nome,
    required this.produtos,
    required this.calcularPreco,
  });

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Container(
        width: MediaQuery.of(context).size.width * 0.9,
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.7,
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Múltiplos Produtos Encontrados',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        nome,
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.blue[200]!),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.blue[700], size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Foram encontrados ${produtos.length} produtos com este nome. Selecione o produto desejado:',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.blue[800],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Flexible(
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: produtos.length,
                itemBuilder: (context, i) {
                  final produto = produtos[i];
                  final preco = calcularPreco(produto);

                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    elevation: 1,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(color: Colors.grey[300]!),
                    ),
                    child: InkWell(
                      onTap: () => Navigator.of(context).pop(produto.id),
                      borderRadius: BorderRadius.circular(12),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    produto.nome,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15,
                                    ),
                                  ),
                                ),
                                Text(
                                  Formatters.formatCurrency(preco),
                                  style: TextStyle(
                                    color: Colors.green[700],
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            if (produto.cor != null) ...[
                              Row(
                                children: [
                                  Icon(Icons.palette, size: 14, color: Colors.grey[600]),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Cor: ${produto.cor}',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Colors.grey[600],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                            ],
                            Row(
                              children: [
                                Icon(Icons.inventory_2, size: 14, color: Colors.grey[600]),
                                const SizedBox(width: 4),
                                Text(
                                  'Estoque: ${produto.quantidade} unidades',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey[600],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            // IMEI e Código de Barras em destaque
                            if (produto.imei != null || produto.codigoBarras != null) ...[
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: Colors.grey[100],
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: Colors.grey[300]!),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    if (produto.imei != null) ...[
                                      Row(
                                        children: [
                                          Icon(Icons.phone_android, size: 16, color: Colors.blue[700]),
                                          const SizedBox(width: 6),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  'IMEI',
                                                  style: TextStyle(
                                                    fontSize: 10,
                                                    color: Colors.grey[600],
                                                    fontWeight: FontWeight.w500,
                                                  ),
                                                ),
                                                Text(
                                                  produto.imei!,
                                                  style: TextStyle(
                                                    fontSize: 13,
                                                    color: Colors.grey[900],
                                                    fontFamily: 'monospace',
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                      if (produto.codigoBarras != null) const SizedBox(height: 8),
                                    ],
                                    if (produto.codigoBarras != null) ...[
                                      Row(
                                        children: [
                                          Icon(Icons.qr_code, size: 16, color: Colors.green[700]),
                                          const SizedBox(width: 6),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  'Código de Barras',
                                                  style: TextStyle(
                                                    fontSize: 10,
                                                    color: Colors.grey[600],
                                                    fontWeight: FontWeight.w500,
                                                  ),
                                                ),
                                                Text(
                                                  produto.codigoBarras!,
                                                  style: TextStyle(
                                                    fontSize: 13,
                                                    color: Colors.grey[900],
                                                    fontFamily: 'monospace',
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ] else ...[
                              // Se não tiver IMEI nem código, mostrar mensagem
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: Colors.amber[50],
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: Colors.amber[200]!),
                                ),
                                child: Row(
                                  children: [
                                    Icon(Icons.info_outline, size: 14, color: Colors.amber[700]),
                                    const SizedBox(width: 6),
                                    Expanded(
                                      child: Text(
                                        'Sem IMEI ou código de barras cadastrado',
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: Colors.amber[800],
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: TextButton(
                onPressed: () => Navigator.of(context).pop(),
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Text('Cancelar'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

