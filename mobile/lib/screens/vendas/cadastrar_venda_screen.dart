import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../../core/services/auth_service.dart';
import '../../core/services/api_service.dart';
import '../../core/services/produto_service.dart';
import '../../core/models/produto.dart';
import '../../core/models/produto_venda.dart';
import '../../shared/utils/formatters.dart';
import '../../shared/widgets/produto_selection_dialogs.dart';
import '../../shared/helpers/produto_scanner_helper.dart';
import '../../shared/helpers/venda_helper.dart';


class CadastrarVendaScreen extends StatefulWidget {
  const CadastrarVendaScreen({super.key});

  @override
  State<CadastrarVendaScreen> createState() => _CadastrarVendaScreenState();
}

class _CadastrarVendaScreenState extends State<CadastrarVendaScreen> {
  final _formKey = GlobalKey<FormState>();
  final _authService = AuthService();
  final _apiService = ApiService();
  final _produtoService = ProdutoService();
  final _imagePicker = ImagePicker();

  // Form controllers
  final _clienteNomeController = TextEditingController();
  final _telefoneController = TextEditingController();
  final _enderecoController = TextEditingController();
  final _observacoesController = TextEditingController();

  // Estado
  bool _loading = false;
  bool _loadingProdutos = true;
  List<Produto> _produtos = [];
  String _tipoCliente = 'lojista';
  String _formaPagamento = 'dinheiro';
  bool _mostrarFormasMistas = false;
  File? _fotoProduto;
  String? _fotoPreview;

  // Produtos da venda
  List<ProdutoVenda> _produtosVenda = [
    ProdutoVenda(nome: '', quantidade: 0, precoUnitario: 0),
  ];

  // Valores de pagamento misto
  final _valorPixController = TextEditingController();
  final _valorCartaoController = TextEditingController();
  final _valorDinheiroController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _carregarProdutos();
  }

  @override
  void dispose() {
    _clienteNomeController.dispose();
    _telefoneController.dispose();
    _enderecoController.dispose();
    _observacoesController.dispose();
    _valorPixController.dispose();
    _valorCartaoController.dispose();
    _valorDinheiroController.dispose();
    super.dispose();
  }

  Future<void> _carregarProdutos() async {
    final user = _authService.currentUser;
    if (user == null) return;

    setState(() {
      _loadingProdutos = true;
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
            SnackBar(content: Text(response.message ?? 'Erro ao carregar produtos')),
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
          _loadingProdutos = false;
        });
      }
    }
  }

  double _calcularPreco(Produto produto) {
    switch (_tipoCliente) {
      case 'lojista':
        return produto.valorAtacado ?? produto.preco;
      case 'consumidor':
        return produto.valorVarejo ?? produto.preco;
      case 'revendaEspecial':
        return produto.valorRevendaEspecial ?? produto.preco;
      default:
        return produto.preco;
    }
  }

  double _getPrecoUnitario(int index) {
    final produtoVenda = _produtosVenda[index];
    if (produtoVenda.usarPrecoPersonalizado && produtoVenda.precoPersonalizado != null) {
      return produtoVenda.precoPersonalizado!;
    }
    if (produtoVenda.produtoId != null) {
      final produto = _produtos.firstWhere(
        (p) => p.id == produtoVenda.produtoId,
        orElse: () => Produto(id: '', nome: '', preco: 0, quantidade: 0),
      );
      return _calcularPreco(produto);
    }
    return 0;
  }

  double _getSubtotal(int index) {
    return _getPrecoUnitario(index) * _produtosVenda[index].quantidade;
  }

  double _getValorTotal() {
    double total = 0;
    for (int i = 0; i < _produtosVenda.length; i++) {
      total += _getSubtotal(i);
    }
    return total;
  }

  void _adicionarProduto() {
    setState(() {
      _produtosVenda.add(ProdutoVenda(nome: '', quantidade: 0, precoUnitario: 0));
    });
  }

  void _removerProduto(int index) {
    if (_produtosVenda.length > 1) {
      setState(() {
        _produtosVenda.removeAt(index);
      });
    }
  }

  void _onProdutoSelecionado(int index, String? produtoId) {
    if (produtoId == null) return;

    final produto = _produtos.firstWhere(
      (p) => p.id == produtoId,
      orElse: () => Produto(id: '', nome: '', preco: 0, quantidade: 0),
    );

    setState(() {
      _produtosVenda[index] = ProdutoVenda(
        produtoId: produtoId,
        nome: produto.nome,
        quantidade: _produtosVenda[index].quantidade,
        precoUnitario: _calcularPreco(produto),
        usarPrecoPersonalizado: _produtosVenda[index].usarPrecoPersonalizado,
        precoPersonalizado: _produtosVenda[index].precoPersonalizado,
      );
    });
  }

  Future<void> _mostrarDialogSelecaoProduto(int index) async {
    final produtosDisponiveis = _produtos.where((p) => p.quantidade > 0).toList();
    final produtoSelecionadoId = _produtosVenda[index].produtoId;

    final produtoEscolhido = await showDialog<String>(
      context: context,
      builder: (BuildContext dialogContext) {
          return ProdutoSelectionDialog(
          produtos: produtosDisponiveis,
          produtoSelecionadoId: produtoSelecionadoId,
          calcularPreco: _calcularPreco,
        );
      },
    );

    if (produtoEscolhido != null) {
      _onProdutoSelecionado(index, produtoEscolhido);
    }
  }

  Future<void> _abrirScanner(int index) async {
    final produtoId = await ProdutoScannerHelper.abrirScanner(
      context: context,
      produtos: _produtos,
      calcularPreco: _calcularPreco,
      produtoSelecionadoId: _produtosVenda[index].produtoId,
    );

    if (produtoId != null) {
      _onProdutoSelecionado(index, produtoId);
    }
  }

  Future<void> _pickImage() async {
    try {
      final pickedFile = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1920,
        maxHeight: 1920,
        imageQuality: 85,
      );

      if (pickedFile != null) {
        setState(() {
          _fotoProduto = File(pickedFile.path);
          _fotoPreview = pickedFile.path;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao selecionar imagem: $e')),
        );
      }
    }
  }

  void _removerFoto() {
    setState(() {
      _fotoProduto = null;
      _fotoPreview = null;
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    // Validar produtos
    final produtosValidos = VendaHelper.prepararProdutos(_produtosVenda);

    if (produtosValidos.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Selecione pelo menos um produto')),
      );
      return;
    }

    final user = _authService.currentUser;
    if (user == null) return;

    setState(() {
      _loading = true;
    });

    try {
      final venda = VendaHelper.construirPayloadVenda(
        clienteNome: _clienteNomeController.text,
        telefone: _telefoneController.text,
        endereco: _enderecoController.text,
        produtos: produtosValidos,
        formaPagamento: _formaPagamento,
        usuarioId: user.id,
        tipoCliente: _tipoCliente,
        observacoes: _observacoesController.text,
        valorPix: _valorPixController.text,
        valorCartao: _valorCartaoController.text,
        valorDinheiro: _valorDinheiroController.text,
      );

      final response = await _apiService.post<Map<String, dynamic>>(
        '/vendas/cadastrar',
        venda,
      );

      if (response.success) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Venda cadastrada com sucesso!\nCliente: ${_clienteNomeController.text}\nValor Total: ${Formatters.formatCurrency(_getValorTotal())}',
              ),
              duration: const Duration(seconds: 5),
              backgroundColor: Colors.green,
            ),
          );

          // Limpar formulário
          _formKey.currentState!.reset();
          _clienteNomeController.clear();
          _telefoneController.clear();
          _enderecoController.clear();
          _observacoesController.clear();
          _valorPixController.clear();
          _valorCartaoController.clear();
          _valorDinheiroController.clear();
          _produtosVenda = [ProdutoVenda(nome: '', quantidade: 0, precoUnitario: 0)];
          _tipoCliente = 'lojista';
          _formaPagamento = 'dinheiro';
          _fotoProduto = null;
          _fotoPreview = null;
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(response.message ?? 'Erro ao cadastrar venda')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro: $e')),
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Cadastrar Venda'),
      ),
      body: _loadingProdutos
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header
                    const Text(
                      'Cadastrar Nova Venda',
                      style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Preencha os dados do cliente e dos produtos vendidos',
                      style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                    ),
                    const SizedBox(height: 24),

                    // Tipo de Cliente
                    _buildTipoClienteSection(),
                    const SizedBox(height: 24),

                    // Dados do Cliente
                    _buildDadosClienteSection(),
                    const SizedBox(height: 24),

                    // Produtos
                    _buildProdutosSection(),
                    const SizedBox(height: 24),

                    // Forma de Pagamento
                    _buildFormaPagamentoSection(),
                    const SizedBox(height: 24),

                    // Foto (Desativado temporariamente)
                    // _buildFotoSection(),
                    // const SizedBox(height: 24),

                    // Observações
                    _buildObservacoesSection(),
                    const SizedBox(height: 24),

                    // Botão Salvar
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _loading ? null : _submit,
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          backgroundColor: Colors.grey[900],
                          foregroundColor: Colors.white,
                        ),
                        child: _loading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Text(
                                'Cadastrar Venda',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildTipoClienteSection() {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey[200]!),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Tipo de Cliente',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            _buildTipoClienteButton('lojista', '🏢 Lojista', 'Preço de atacado'),
            const SizedBox(height: 12),
            _buildTipoClienteButton('consumidor', '🛍️ Consumidor', 'Preço de varejo'),
            const SizedBox(height: 12),
            _buildTipoClienteButton('revendaEspecial', '➕ Revenda Especial', 'Preço especial'),
          ],
        ),
      ),
    );
  }

  Widget _buildTipoClienteButton(String tipo, String label, String subtitle) {
    final isSelected = _tipoCliente == tipo;
    return InkWell(
      onTap: () => setState(() => _tipoCliente = tipo),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        decoration: BoxDecoration(
          color: isSelected ? Colors.grey[900] : Colors.white,
          border: Border.all(
            color: isSelected ? Colors.grey[900]! : Colors.grey[300]!,
            width: isSelected ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected ? Colors.white : Colors.grey[400]!,
                  width: 2,
                ),
                color: isSelected ? Colors.white : Colors.transparent,
              ),
              child: isSelected
                  ? Icon(Icons.check, size: 14, color: Colors.grey[900])
                  : null,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: isSelected ? Colors.white : Colors.grey[900],
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 13,
                      color: isSelected ? Colors.grey[300] : Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDadosClienteSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Dados do Cliente',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _clienteNomeController,
              decoration: const InputDecoration(
                labelText: 'Nome do Cliente *',
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Nome é obrigatório';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _telefoneController,
              decoration: const InputDecoration(
                labelText: 'Telefone *',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.phone,
              onChanged: (value) {
                final formatted = Formatters.formatPhone(value);
                if (formatted != value) {
                  _telefoneController.value = TextEditingValue(
                    text: formatted,
                    selection: TextSelection.collapsed(offset: formatted.length),
                  );
                }
              },
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Telefone é obrigatório';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _enderecoController,
              decoration: const InputDecoration(
                labelText: 'Endereço *',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Endereço é obrigatório';
                }
                return null;
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProdutosSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Produtos da Venda',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                TextButton.icon(
                  onPressed: _adicionarProduto,
                  icon: const Icon(Icons.add),
                  label: const Text('Adicionar'),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ...List.generate(_produtosVenda.length, (index) {
              return _buildProdutoItem(index);
            }),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.green[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.green[200]!),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Total:',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    Formatters.formatCurrency(_getValorTotal()),
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: Colors.green[700],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProdutoItem(int index) {
    final produtoVenda = _produtosVenda[index];
    final produtosDisponiveis = _produtos.where((p) => p.quantidade > 0).toList();

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey[300]!),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Produto ${index + 1}',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              if (_produtosVenda.length > 1)
                IconButton(
                  icon: const Icon(Icons.delete, color: Colors.red),
                  onPressed: () => _removerProduto(index),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: () => _mostrarDialogSelecaoProduto(index),
                  child: InputDecorator(
                    decoration: InputDecoration(
                      labelText: 'Produto *',
                      border: const OutlineInputBorder(),
                      suffixIcon: const Icon(Icons.arrow_drop_down),
                      errorText: produtoVenda.produtoId == null ? 'Selecione um produto' : null,
                    ),
                    child: Text(
                      produtoVenda.produtoId != null
                          ? produtoVenda.nome
                          : 'Selecione um produto',
                      style: TextStyle(
                        color: produtoVenda.produtoId != null ? Colors.black : Colors.grey[600],
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                onPressed: () => _abrirScanner(index),
                icon: const Icon(Icons.qr_code_scanner),
                tooltip: 'Escanear código de barras',
                style: IconButton.styleFrom(
                  backgroundColor: Colors.grey[100],
                  padding: const EdgeInsets.all(12),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextFormField(
            decoration: const InputDecoration(
              labelText: 'Quantidade *',
              border: OutlineInputBorder(),
            ),
            keyboardType: TextInputType.number,
            initialValue: produtoVenda.quantidade > 0 ? produtoVenda.quantidade.toString() : null,
            onChanged: (value) {
              final qty = int.tryParse(value) ?? 0;
              setState(() {
                _produtosVenda[index].quantidade = qty;
              });
            },
            validator: (value) {
              if (value == null || value.isEmpty || int.tryParse(value) == null || int.parse(value) <= 0) {
                return 'Quantidade inválida';
              }
              return null;
            },
          ),
        ],
      ),
    );
  }

  Widget _buildFormaPagamentoSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Forma de Pagamento',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 2.5,
              children: [
                _buildFormaPagamentoButton('pix', 'PIX', Icons.qr_code, Colors.teal),
                _buildFormaPagamentoButton('cartao', 'Cartão', Icons.credit_card, Colors.blue),
                _buildFormaPagamentoButton('dinheiro', 'Dinheiro', Icons.money, Colors.green),
                _buildFormaPagamentoButton('crediario', 'Crediário', Icons.receipt_long, Colors.orange),
              ],
            ),
            if (_mostrarFormasMistas) ...[
              const SizedBox(height: 16),
              TextFormField(
                controller: _valorPixController,
                decoration: const InputDecoration(
                  labelText: 'Valor PIX',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _valorCartaoController,
                decoration: const InputDecoration(
                  labelText: 'Valor Cartão',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _valorDinheiroController,
                decoration: const InputDecoration(
                  labelText: 'Valor Dinheiro',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildFormaPagamentoButton(String forma, String label, IconData icon, Color color) {
    final isSelected = _formaPagamento == forma;
    return InkWell(
      onTap: () {
        setState(() {
          _formaPagamento = forma;
        });
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        decoration: BoxDecoration(
          color: isSelected ? color : Colors.white,
          border: Border.all(
            color: isSelected ? color : Colors.grey[300]!,
            width: isSelected ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              color: isSelected ? Colors.white : color,
              size: 20,
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: isSelected ? Colors.white : Colors.grey[900],
              ),
            ),
            if (isSelected) ...[
              const SizedBox(width: 8),
              Icon(
                Icons.check_circle,
                color: Colors.white,
                size: 18,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildFotoSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Foto da Venda (Opcional)',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            if (_fotoPreview != null) ...[
              Stack(
                children: [
                  Image.file(
                    File(_fotoPreview!),
                    height: 200,
                    width: double.infinity,
                    fit: BoxFit.cover,
                  ),
                  Positioned(
                    top: 8,
                    right: 8,
                    child: IconButton(
                      icon: const Icon(Icons.close, color: Colors.white),
                      onPressed: _removerFoto,
                      style: IconButton.styleFrom(
                        backgroundColor: Colors.red,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
            ],
            OutlinedButton.icon(
              onPressed: _pickImage,
              icon: const Icon(Icons.camera_alt),
              label: const Text('Selecionar Foto'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildObservacoesSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Observações',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _observacoesController,
              decoration: const InputDecoration(
                labelText: 'Observações adicionais',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
          ],
        ),
      ),
    );
  }
}
