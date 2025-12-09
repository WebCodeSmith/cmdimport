'use client'

import { useState, useEffect } from 'react'
import { VendaFormData, ProdutoVenda } from '@/types/venda'
import { Produto } from '@/types/produto'
import { usePhoneFormatter } from '@/hooks/usePhoneFormatter'
import { useToastContext } from '@/contexts/ToastContext'
import ProductDropdown from './ProductDropdown'
import { CadastrarVendaSectionProps } from '@/types/components'

export default function CadastrarVendaSection({ usuarioId }: CadastrarVendaSectionProps) {
  const [formData, setFormData] = useState<VendaFormData>({
    clienteNome: '',
    telefone: '',
    endereco: '',
    produto: '',
    quantidade: '',
    observacoes: '',
    formaPagamento: 'dinheiro',
    valorPix: '',
    valorCartao: '',
    valorDinheiro: '',
    valorPersonalizado: '',
    usarValorPersonalizado: false
  })

  // Estado para múltiplos produtos
  const [produtosVenda, setProdutosVenda] = useState<ProdutoVenda[]>([{
    produto: '',
    quantidade: '',
    preco: 0,
    nome: '',
    precoPersonalizado: '',
    usarPrecoPersonalizado: false
  }])

  const [tipoCliente, setTipoCliente] = useState<'lojista' | 'consumidor' | 'revendaEspecial'>('lojista')
  const [loading, setLoading] = useState(false)
  const [mostrarFormasMistas, setMostrarFormasMistas] = useState(false)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const { phone, handlePhoneChange, resetPhone } = usePhoneFormatter()
  const { showToast } = useToastContext()

  const [produtos, setProdutos] = useState<Produto[]>([])

  // Funções para gerenciar múltiplos produtos
  const adicionarProduto = () => {
    setProdutosVenda([{
      produto: '',
      quantidade: '',
      preco: 0,
      nome: '',
      precoPersonalizado: '',
      usarPrecoPersonalizado: false
    }, ...produtosVenda])
  }

  const removerProduto = (index: number) => {
    if (produtosVenda.length > 1) {
      const novosProdutos = produtosVenda.filter((_, i) => i !== index)
      setProdutosVenda(novosProdutos)
    }
  }

  const atualizarProduto = (index: number, campo: string, valor: string | number | boolean) => {
    const novosProdutos = [...produtosVenda]
    novosProdutos[index] = { ...novosProdutos[index], [campo]: valor }
    setProdutosVenda(novosProdutos)
  }

  // Calcular valor total dos produtos
  const calcularValorTotal = () => {
    return produtosVenda.reduce((total, item) => {
      const quantidade = parseInt(item.quantidade) || 0
      const preco = item.usarPrecoPersonalizado && item.precoPersonalizado
        ? parseFloat(item.precoPersonalizado.replace(/[^\d,]/g, '').replace(',', '.')) || 0
        : item.preco
      return total + (preco * quantidade)
    }, 0)
  }

  // Carregar produtos do estoque
  useEffect(() => {
  const carregarProdutos = async () => {
    try {
      const { stockApi } = await import('@/lib/api')
      const response = await stockApi.listar(usuarioId)
      
      if (response.success && response.data) {
        const produtosFormatados = (response.data as any[]).map((item: Record<string, unknown>) => ({
            id: (item.id as number).toString(), // Usar o ID real do estoque
            nome: item.nome as string,
            preco: item.preco as number,
            quantidade: item.quantidade as number, // Incluir quantidade
            valorAtacado: item.valorAtacado as number | null,
            valorVarejo: item.valorVarejo as number | null,
            cor: item.cor as string | undefined,
            imei: item.imei as string | undefined,
            codigoBarras: item.codigoBarras as string | undefined
          }))
          setProdutos(produtosFormatados)
        }
      } catch (error) {
        console.error('Erro ao carregar produtos:', error)
      }
    }

    carregarProdutos()
  }, [usuarioId])


  // Atualizar preço quando o tipo de cliente mudar
  const handleTipoClienteChange = (tipo: 'lojista' | 'consumidor' | 'revendaEspecial') => {
    setTipoCliente(tipo)
    
    if (formData.produto) {
      const produtoSelecionado = produtos.find(p => p.id === formData.produto)
      if (produtoSelecionado) {
        // Preço será calculado automaticamente baseado no tipo de cliente
      }
    }
  }

  const handleFotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Verificar tipo de arquivo
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      showToast('Tipo de arquivo não permitido. Use apenas PNG ou JPG.', 'error')
      return
    }

    // Verificar tamanho (máximo 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      showToast('Arquivo muito grande. Tamanho máximo: 5MB', 'error')
      return
    }

    setUploadingFoto(true)

    try {
      const formData = new FormData()
      formData.append('foto', file)

      const { uploadApi } = await import('@/lib/api')
      const result = await uploadApi.foto(file)

      if (result.success) {
        setFormData(prev => ({ ...prev, fotoProduto: result.filePath }))
        setFotoPreview(result.filePath)
        showToast('Foto enviada com sucesso!', 'success')
      } else {
        showToast(result.message || 'Erro ao fazer upload da foto', 'error')
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
      showToast('Erro ao fazer upload da foto', 'error')
    } finally {
      setUploadingFoto(false)
    }
  }

  const removerFoto = () => {
    setFormData(prev => ({ ...prev, fotoProduto: '' }))
    setFotoPreview(null)
  }

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    handlePhoneChange(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Validar se pelo menos um produto foi selecionado
      const produtosValidos = produtosVenda.filter(p => p.produto && p.quantidade && parseInt(p.quantidade) > 0)
      
      if (produtosValidos.length === 0) {
        showToast('Selecione pelo menos um produto para a venda', 'error')
        setLoading(false)
        return
      }

      // Calcular valor total
      const valorTotal = calcularValorTotal()
      
      // Mapear produtos para o formato esperado pelo backend
      const produtosFormatados = produtosValidos.map(p => ({
        produto: p.produto, // ID do estoque
        nome: p.nome || '', // Nome do produto
        quantidade: p.quantidade, // Quantidade como string
        usarPrecoPersonalizado: p.usarPrecoPersonalizado || false,
        precoPersonalizado: p.usarPrecoPersonalizado && p.precoPersonalizado ? p.precoPersonalizado : undefined
      }))
      
      // Criar uma única venda com múltiplos produtos
      const venda = {
        clienteNome: formData.clienteNome,
        telefone: phone,
        endereco: formData.endereco,
        produtos: produtosFormatados,
        observacoes: formData.observacoes || undefined,
        formaPagamento: formData.formaPagamento,
        valorPix: formData.valorPix ? parseFloat(formData.valorPix.replace(/[^\d,]/g, '').replace(',', '.')) : undefined,
        valorCartao: formData.valorCartao ? parseFloat(formData.valorCartao.replace(/[^\d,]/g, '').replace(',', '.')) : undefined,
        valorDinheiro: formData.valorDinheiro ? parseFloat(formData.valorDinheiro.replace(/[^\d,]/g, '').replace(',', '.')) : undefined,
        tipoCliente: tipoCliente,
        usuarioId
      }

      // Enviar venda
      const { saleApi } = await import('@/lib/api')
      const result = await saleApi.cadastrar(venda)
      
      if (result.success) {
        const nomesProdutos = produtosValidos.map(p => p.nome).join(', ')
        showToast(
          `Venda cadastrada com sucesso! Cliente: ${formData.clienteNome} - Produtos: ${nomesProdutos} - Valor Total: R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          'success'
        )
        
        // Limpar formulário
        setFormData({
          clienteNome: '',
          telefone: '',
          endereco: '',
          produto: '',
          quantidade: '',
          observacoes: '',
          formaPagamento: 'dinheiro',
          valorPix: '',
          valorCartao: '',
          valorDinheiro: '',
          valorPersonalizado: '',
          usarValorPersonalizado: false
        })
        setProdutosVenda([{
          produto: '',
          quantidade: '',
          preco: 0,
          nome: '',
          precoPersonalizado: '',
          usarPrecoPersonalizado: false
        }])
        resetPhone()
      } else {
        showToast(result.message || 'Erro ao cadastrar venda', 'error')
      }
    } catch (error) {
      console.error('Erro ao cadastrar venda:', error)
      showToast('Erro de conexão. Tente novamente.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">➕ Cadastrar Nova Venda</h3>
        <p className="text-gray-600">Preencha os dados do cliente e do produto vendido</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Seleção de Tipo de Cliente */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Tipo de Cliente</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => handleTipoClienteChange('lojista')}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                tipoCliente === 'lojista'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  tipoCliente === 'lojista' ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                }`}>
                  {tipoCliente === 'lojista' && (
                    <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                  )}
                </div>
                <div>
                  <div className="font-semibold">🏢 Lojista</div>
                  <div className="text-sm opacity-75">Preço de atacado</div>
                </div>
              </div>
            </button>
            
            <button
              type="button"
              onClick={() => handleTipoClienteChange('consumidor')}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                tipoCliente === 'consumidor'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  tipoCliente === 'consumidor' ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                }`}>
                  {tipoCliente === 'consumidor' && (
                    <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                  )}
                </div>
                <div>
                  <div className="font-semibold">🛍️ Consumidor</div>
                  <div className="text-sm opacity-75">Preço de varejo</div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTipoClienteChange('revendaEspecial')}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                tipoCliente === 'revendaEspecial'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  tipoCliente === 'revendaEspecial' ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                }`}>
                  {tipoCliente === 'revendaEspecial' && (
                    <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                  )}
                </div>
                <div>
                  <div className="font-semibold">➕ Revenda Especial</div>
                  <div className="text-sm opacity-75">Preço especial</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Cliente *
            </label>
            <input
              type="text"
              required
              value={formData.clienteNome}
              onChange={(e) => setFormData({...formData, clienteNome: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
              placeholder="Nome completo do cliente"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefone *
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={handlePhoneInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
              placeholder="(11) 99999-9999"
              maxLength={15}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Endereço *
          </label>
          <input
            type="text"
            required
            value={formData.endereco}
            onChange={(e) => setFormData({...formData, endereco: e.target.value})}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
            placeholder="Endereço completo"
          />
        </div>

        {/* Seção de Produtos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Produtos da Venda</h3>
            <button
              type="button"
              onClick={adicionarProduto}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Adicionar Produto
            </button>
          </div>

          {produtosVenda.map((produto, index) => (
            <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700">Produto {produtosVenda.length - index}</h4>
                {produtosVenda.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removerProduto(index)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Produto *
                  </label>
                  <ProductDropdown
                    produtos={produtos}
                    selectedProduct={produto.produto}
                    onSelect={(produtoId) => {
                      const produtoSelecionado = produtos.find(p => p.id === produtoId)
                      if (produtoSelecionado) {
                        // Usar preço específico se disponível, senão usar preço base
                        let preco: number | null = null
                        if (tipoCliente === 'lojista') {
                          preco = produtoSelecionado.valorAtacado ?? null
                        } else if (tipoCliente === 'consumidor') {
                          preco = produtoSelecionado.valorVarejo ?? null
                        } else if (tipoCliente === 'revendaEspecial') {
                          // Revenda Especial usa preço de atacado (ou pode ser ajustado para outro campo)
                          preco = produtoSelecionado.valorAtacado ?? null
                        }
                        if (!preco) {
                          preco = produtoSelecionado.preco // Usar preço base como fallback
                        }
                        
                        // Atualizar tudo de uma vez
                        const novosProdutos = [...produtosVenda]
                        novosProdutos[index] = {
                          ...novosProdutos[index],
                          produto: produtoId,
                          nome: produtoSelecionado.nome,
                          preco: preco || 0
                        }
                        setProdutosVenda(novosProdutos)
                      }
                    }}
                    placeholder="Selecione um produto"
                    usuarioId={usuarioId}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantidade *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={produto.quantidade}
                    onChange={(e) => atualizarProduto(index, 'quantidade', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white focus:bg-white text-gray-900 placeholder-gray-500"
                    placeholder="Quantidade"
                  />
                </div>
              </div>

              {produto.nome && produto.quantidade && (
                <div className="mt-3 space-y-3">
                  {/* Preço personalizado por produto */}
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-center space-x-3 mb-3">
                      <input
                        type="checkbox"
                        id={`usar-preco-personalizado-${index}`}
                        checked={produto.usarPrecoPersonalizado || false}
                        onChange={(e) => atualizarProduto(index, 'usarPrecoPersonalizado', e.target.checked)}
                        className="w-4 h-4 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 focus:ring-2"
                      />
                      <label htmlFor={`usar-preco-personalizado-${index}`} className="text-sm font-medium text-gray-700">
                        ✏️ Definir preço personalizado para este produto
                      </label>
                    </div>
                    
                    {produto.usarPrecoPersonalizado && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Preço Unitário Personalizado *
                        </label>
                        <input
                          type="text"
                          value={produto.precoPersonalizado || ''}
                          onChange={(e) => {
                            // Formatação simples de moeda brasileira
                            const numbers = e.target.value.replace(/\D/g, '')
                            if (!numbers) {
                              atualizarProduto(index, 'precoPersonalizado', '')
                              return
                            }
                            const amount = parseInt(numbers) / 100
                            const formattedValue = new Intl.NumberFormat('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            }).format(amount)
                            atualizarProduto(index, 'precoPersonalizado', formattedValue)
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                          placeholder="R$ 0,00"
                        />
                      </div>
                    )}
                  </div>

                  {/* Resumo do produto */}
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-800">
                      <span className="font-medium">{produto.nome}</span> - 
                      Quantidade: {produto.quantidade} - 
                      Preço unitário: R$ {(produto.usarPrecoPersonalizado && produto.precoPersonalizado 
                        ? parseFloat(produto.precoPersonalizado.replace(/[^\d,]/g, '').replace(',', '.')) || 0
                        : produto.preco
                      ).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} - 
                      <span className="font-semibold">Subtotal: R$ {(
                        (produto.usarPrecoPersonalizado && produto.precoPersonalizado 
                          ? parseFloat(produto.precoPersonalizado.replace(/[^\d,]/g, '').replace(',', '.')) || 0
                          : produto.preco
                        ) * parseInt(produto.quantidade || '0')
                      ).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

        </div>




        {/* Forma de Pagamento */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">Forma de Pagamento</h4>
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
              Total: R$ {calcularValorTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <button
              type="button"
              onClick={() => setFormData({...formData, formaPagamento: 'pix'})}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                formData.formaPagamento === 'pix'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  formData.formaPagamento === 'pix' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`}>
                  {formData.formaPagamento === 'pix' && (
                    <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                  )}
                </div>
                <div>
                  <div className="font-semibold">💳 PIX</div>
                  <div className="text-sm opacity-75">Pagamento instantâneo</div>
                </div>
              </div>
            </button>
            
            <button
              type="button"
              onClick={() => setFormData({...formData, formaPagamento: 'cartao'})}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                formData.formaPagamento === 'cartao'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  formData.formaPagamento === 'cartao' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`}>
                  {formData.formaPagamento === 'cartao' && (
                    <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                  )}
                </div>
                <div>
                  <div className="font-semibold">💳 Cartão</div>
                  <div className="text-sm opacity-75">Débito ou crédito</div>
                </div>
              </div>
            </button>
            
            <button
              type="button"
              onClick={() => setFormData({...formData, formaPagamento: 'dinheiro'})}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                formData.formaPagamento === 'dinheiro'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  formData.formaPagamento === 'dinheiro' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`}>
                  {formData.formaPagamento === 'dinheiro' && (
                    <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                  )}
                </div>
                <div>
                  <div className="font-semibold">💵 Dinheiro</div>
                  <div className="text-sm opacity-75">Pagamento à vista</div>
                </div>
              </div>
            </button>
            
            <button
              type="button"
              onClick={() => setFormData({...formData, formaPagamento: 'crediario'})}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                formData.formaPagamento === 'crediario'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  formData.formaPagamento === 'crediario' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`}>
                  {formData.formaPagamento === 'crediario' && (
                    <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                  )}
                </div>
                <div>
                  <div className="font-semibold">📋 Crediário</div>
                  <div className="text-sm opacity-75">Pagamento pendente</div>
                </div>
              </div>
            </button>
          </div>

          {/* Botão para mostrar formas mistas */}
          <div className="border-t border-blue-200 pt-4">
            <button
              type="button"
              onClick={() => setMostrarFormasMistas(!mostrarFormasMistas)}
              className="w-full flex items-center justify-center space-x-2 p-3 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 text-gray-600 hover:text-blue-600"
            >
              <span className="font-medium">
                {mostrarFormasMistas ? 'Ocultar' : 'Mais'} Formas de Pagamento
              </span>
              <div className={`transform transition-transform duration-200 ${
                mostrarFormasMistas ? 'rotate-180' : ''
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Opções de formas mistas - só aparece quando expandido */}
            {mostrarFormasMistas && (
              <div className="mt-4 space-y-3">
                <h5 className="text-sm font-semibold text-gray-700 mb-3">Formas Mistas</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, formaPagamento: 'pix_cartao'})}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                      formData.formaPagamento === 'pix_cartao'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="font-medium">PIX + Cartão</div>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, formaPagamento: 'pix_dinheiro'})}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                      formData.formaPagamento === 'pix_dinheiro'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="font-medium">PIX + Dinheiro</div>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, formaPagamento: 'cartao_dinheiro'})}
                    className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                      formData.formaPagamento === 'cartao_dinheiro'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="font-medium">Cartão + Dinheiro</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upload de Foto */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">📸 Foto do Produto</h4>
          
          <div className="space-y-4">
            {/* Área de upload */}
            <div className="relative">
              <input
                type="file"
                id="foto-produto"
                accept=".png,.jpg,.jpeg"
                onChange={handleFotoChange}
                disabled={uploadingFoto}
                className="hidden"
              />
              
              <label
                htmlFor="foto-produto"
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  uploadingFoto
                    ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                    : 'border-purple-300 hover:border-purple-400 hover:bg-purple-50'
                }`}
              >
                {uploadingFoto ? (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    <span className="text-sm text-gray-600">Enviando...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="text-sm text-gray-600">
                      Clique para anexar foto
                    </span>
                    <span className="text-xs text-gray-500">
                      PNG, JPG (máx. 5MB)
                    </span>
                  </div>
                )}
              </label>
            </div>

            {/* Preview da foto */}
            {fotoPreview && (
              <div className="relative">
                <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fotoPreview}
                    alt="Preview da foto"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={removerFoto}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Foto anexada com sucesso
                </p>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observações
          </label>
          <textarea
            value={formData.observacoes}
            onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500 resize-none"
            placeholder="Observações adicionais (opcional)"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Cadastrando...
              </div>
            ) : (
              'Cadastrar Venda'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
