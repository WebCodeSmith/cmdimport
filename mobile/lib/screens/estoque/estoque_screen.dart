import 'package:flutter/material.dart';
import '../../core/services/auth_service.dart';
import '../../core/services/produto_service.dart';
import '../../core/models/produto.dart';
import '../../shared/utils/formatters.dart';
import '../../shared/widgets/app_drawer.dart';

class EstoqueScreen extends StatefulWidget {
  const EstoqueScreen({super.key});

  @override
  State<EstoqueScreen> createState() => _EstoqueScreenState();
}

class _EstoqueScreenState extends State<EstoqueScreen> {
  final _authService = AuthService();
  final _produtoService = ProdutoService();

  bool _loading = true;
  List<Produto> _produtos = [];
  int? _produtoExpandido;

  @override
  void initState() {
    super.initState();
    _carregarEstoque();
  }

  Future<void> _carregarEstoque() async {
    final user = _authService.currentUser;
    if (user == null) return;

    setState(() {
      _loading = true;
    });

    try {
      final response = await _produtoService.getEstoque(
        usuarioId: user.id,
        ocultarEstoqueZerado: true,
      );

      if (response.success && response.data != null) {
        setState(() {
          _produtos = response.data!;
        });
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(response.message ?? 'Erro ao carregar estoque')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro de conexão: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  void _toggleDescricao(int produtoId) {
    setState(() {
      _produtoExpandido = _produtoExpandido == produtoId ? null : produtoId;
    });
  }

  String _getStatus(int quantidade) {
    if (quantidade == 0) return 'Zerado';
    if (quantidade <= 2) return 'Crítico';
    return 'Em estoque';
  }

  Color _getStatusColor(int quantidade) {
    if (quantidade == 0) return Colors.red;
    if (quantidade <= 2) return Colors.orange;
    return Colors.green;
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Estoque'),
      ),
      drawer: AppDrawer(
        currentRoute: '/estoque',
        authService: _authService,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _carregarEstoque,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header
                    const Text(
                      '📦 Estoque Disponível',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Seus produtos em estoque',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey[600],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Lista de Produtos
                    if (_produtos.isEmpty)
                      Card(
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                          side: BorderSide(color: Colors.grey[200]!),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(48),
                          child: Column(
                            children: [
                              Icon(
                                Icons.inventory_2_outlined,
                                size: 64,
                                color: Colors.grey[400],
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'Nenhum produto em estoque',
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Entre em contato com o administrador para adicionar produtos.',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.grey[600],
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ],
                          ),
                        ),
                      )
                    else
                      ..._produtos.map((produto) {
                        return _buildProdutoCard(produto);
                      }),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildProdutoCard(Produto produto) {
    final status = _getStatus(produto.quantidade);
    final statusColor = _getStatusColor(produto.quantidade);
    final isExpanded = _produtoExpandido == int.tryParse(produto.id);

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey[200]!),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                // Nome e Quantidade
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        produto.nome,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '${produto.quantidade}',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: statusColor,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Informações em Grid
                Row(
                  children: [
                    Expanded(
                      child: _buildInfoItem('Status', status, statusColor),
                    ),
                    Expanded(
                      child: _buildInfoItem(
                        'Preço',
                        Formatters.formatCurrency(produto.preco),
                        Colors.grey[900]!,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    if (produto.cor != null)
                      Expanded(
                        child: _buildInfoItem('Cor', produto.cor!, Colors.grey[900]!),
                      ),
                    if (produto.imei != null)
                      Expanded(
                        child: _buildInfoItem(
                          'IMEI',
                          produto.imei!,
                          Colors.grey[900]!,
                          isMonospace: true,
                        ),
                      ),
                  ],
                ),
                if (produto.codigoBarras != null) ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: _buildInfoItem(
                          'Código de Barras',
                          produto.codigoBarras!,
                          Colors.grey[900]!,
                          isMonospace: true,
                        ),
                      ),
                    ],
                  ),
                ],

                // Botão de Descrição
                if (produto.descricao != null) ...[
                  const SizedBox(height: 12),
                  InkWell(
                    onTap: () => _toggleDescricao(int.tryParse(produto.id) ?? 0),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Ver descrição',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.blue[700],
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Icon(
                            isExpanded
                                ? Icons.keyboard_arrow_up
                                : Icons.keyboard_arrow_down,
                            color: Colors.blue[700],
                            size: 20,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),

          // Descrição Expandida
          if (isExpanded && produto.descricao != null)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey[50],
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(12),
                  bottomRight: Radius.circular(12),
                ),
              ),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey[200]!),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: Colors.blue[100],
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Icon(
                        Icons.info_outline,
                        size: 16,
                        color: Colors.blue[700],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Descrição do Produto',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Colors.grey[900],
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            produto.descricao!,
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey[700],
                              height: 1.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildInfoItem(String label, String value, Color color, {bool isMonospace = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: Colors.grey[600],
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 13,
            color: color,
            fontWeight: FontWeight.bold,
            fontFamily: isMonospace ? 'monospace' : null,
          ),
          overflow: TextOverflow.ellipsis,
          maxLines: 1,
        ),
      ],
    );
  }
}
