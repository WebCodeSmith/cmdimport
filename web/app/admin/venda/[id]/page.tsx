'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { HistoricoVenda } from '@/types/venda'
import { formatDate, formatPhone } from '@/lib/formatters'
import { saleApi, stockApi } from '@/lib/api'

interface Produto {
  id: number
  produtoNome: string
  quantidade: number
  precoUnitario: number
  produtoDetalhes?: {
    imei?: string
    cor?: string
    descricao?: string
  } | null
}

interface EstoqueDisponivel {
  id: number
  produtoNome: string
  quantidade: number
  preco: number
  imei?: string
  codigoBarras?: string
  cor?: string
  descricao?: string
}

export default function DetalhesVendaPage() {
  const params = useParams()
  const router = useRouter()
  const [venda, setVenda] = useState<HistoricoVenda | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Estados para troca de produto
  const [modalTrocaAberto, setModalTrocaAberto] = useState(false)
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [produtosDisponiveis, setProdutosDisponiveis] = useState<EstoqueDisponivel[]>([])
  const [novoProdutoId, setNovoProdutoId] = useState<number | null>(null)
  const [precoPersonalizado, setPrecoPersonalizado] = useState<string>('')
  const [carregandoEstoque, setCarregandoEstoque] = useState(false)
  const [processandoTroca, setProcessandoTroca] = useState(false)
  const [buscaEstoque, setBuscaEstoque] = useState('')

  useEffect(() => {
    const carregarVenda = async () => {
      try {
        const id = Number(params.id)
        if (isNaN(id)) {
          console.error('ID inválido:', params.id)
          router.push('/admin')
          return
        }

        const response = await saleApi.buscarPorIDAdmin(id)
        
        if (response.success && response.data) {
          setVenda(response.data)
        } else {
          console.error('Erro ao carregar venda:', response.message)
          router.push('/admin')
        }
      } catch (error) {
        console.error('Erro ao carregar venda:', error)
        router.push('/admin')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      carregarVenda()
    }
  }, [params.id, router])

  const abrirModalTroca = async (produto: Produto) => {
    setProdutoSelecionado(produto)
    setModalTrocaAberto(true)
    setNovoProdutoId(null)
    setPrecoPersonalizado('')
    setBuscaEstoque('')
    
    // Carregar produtos disponíveis no estoque de todos os usuários
    setCarregandoEstoque(true)
    try {
      const response = await stockApi.listarEstoqueUsuarios()
      if (response.success && response.data) {
        // O endpoint retorna usuários com seus produtos, precisamos desagrupar
        const todosOsProdutos: EstoqueDisponivel[] = []
        
        response.data.forEach((usuario: any) => {
          if (usuario.produtos && Array.isArray(usuario.produtos)) {
            usuario.produtos.forEach((item: any) => {
              if (item.quantidade > 0) {
                todosOsProdutos.push({
                  id: item.id,
                  produtoNome: item.nome || item.produtoNome,
                  quantidade: item.quantidade,
                  preco: item.preco || 0,
                  imei: item.imei,
                  codigoBarras: item.codigoBarras,
                  cor: item.cor,
                  descricao: item.descricao
                })
              }
            })
          }
        })
        
        setProdutosDisponiveis(todosOsProdutos)
      }
    } catch (error) {
      console.error('Erro ao carregar estoque:', error)
      alert('Erro ao carregar produtos disponíveis')
    } finally {
      setCarregandoEstoque(false)
    }
  }

  const fecharModalTroca = () => {
    setModalTrocaAberto(false)
    setProdutoSelecionado(null)
    setNovoProdutoId(null)
    setPrecoPersonalizado('')
    setBuscaEstoque('')
  }

  const confirmarTroca = async () => {
    if (!produtoSelecionado || !novoProdutoId) {
      alert('Selecione um produto para trocar')
      return
    }

    if (!confirm('Tem certeza que deseja trocar este produto?')) {
      return
    }

    setProcessandoTroca(true)
    try {
      const dadosTroca: any = {
        historicoVendaId: produtoSelecionado.id,
        novoEstoqueId: novoProdutoId,
      }

      // Só adicionar precoUnitario se foi informado
      if (precoPersonalizado && parseFloat(precoPersonalizado) > 0) {
        dadosTroca.precoUnitario = parseFloat(precoPersonalizado)
      }

      console.log('Enviando dados de troca:', dadosTroca)

      const response = await saleApi.trocarProduto(dadosTroca)
      
      console.log('Resposta da API:', response)

      if (response.success) {
        alert('Produto trocado com sucesso!')
        
        // Recarregar a venda
        const id = Number(params.id)
        const vendaResponse = await saleApi.buscarPorIDAdmin(id)
        if (vendaResponse.success && vendaResponse.data) {
          setVenda(vendaResponse.data)
        }
        
        fecharModalTroca()
      } else {
        alert(response.message || 'Erro ao trocar produto')
      }
    } catch (error) {
      console.error('Erro ao trocar produto:', error)
      alert('Erro ao processar troca. Tente novamente.')
    } finally {
      setProcessandoTroca(false)
    }
  }

  const produtosFiltrados = produtosDisponiveis.filter(p =>
    p.produtoNome.toLowerCase().includes(buscaEstoque.toLowerCase()) ||
    p.imei?.toLowerCase().includes(buscaEstoque.toLowerCase()) ||
    p.codigoBarras?.toLowerCase().includes(buscaEstoque.toLowerCase()) ||
    p.cor?.toLowerCase().includes(buscaEstoque.toLowerCase())
  )

  const produtoSelecionadoDetalhes = produtosDisponiveis.find(p => p.id === novoProdutoId)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando detalhes da venda...</p>
        </div>
      </div>
    )
  }

  if (!venda) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Venda não encontrada</h1>
          <button
            onClick={() => router.push('/admin')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Voltar ao Admin
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900">📋 Detalhes da Venda</h1>
            </div>
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Informações do Cliente */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Informações do Cliente
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Nome</label>
                <p className="text-gray-900 font-medium">{venda.clienteNome}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Telefone</label>
                <p className="text-gray-900 font-medium">{formatPhone(venda.telefone)}</p>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-600">Endereço</label>
                <p className="text-gray-900 font-medium">{venda.endereco}</p>
              </div>
            </div>
          </div>

          {/* Informações dos Produtos */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Produtos da Venda ({venda.produtos.length})
            </h2>
            <div className="space-y-4">
              {venda.produtos.map((produto) => (
                <div key={produto.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{produto.produtoNome}</h3>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {produto.quantidade}x
                      </span>
                      <button
                        onClick={() => abrirModalTroca(produto)}
                        className="px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 text-sm font-medium rounded-lg hover:from-purple-200 hover:to-pink-200 transition-all duration-200 flex items-center space-x-1 border border-purple-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <span>Trocar</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Quantidade</label>
                      <p className="text-gray-900 font-medium">{produto.quantidade} unidades</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Preço Unitário</label>
                      <p className="text-gray-900 font-medium">R$ {(produto.precoUnitario || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Subtotal</label>
                      <p className="text-gray-900 font-medium">R$ {((produto.precoUnitario || 0) * produto.quantidade).toFixed(2)}</p>
                    </div>
                    {produto.produtoDetalhes?.imei && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">IMEI</label>
                        <p className="text-gray-900 font-medium">{produto.produtoDetalhes.imei}</p>
                      </div>
                    )}
                    {produto.produtoDetalhes?.cor && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Cor</label>
                        <p className="text-gray-900 font-medium">{produto.produtoDetalhes.cor}</p>
                      </div>
                    )}
                    {produto.produtoDetalhes?.descricao && (
                      <div className="sm:col-span-2 lg:col-span-3">
                        <label className="text-sm font-medium text-gray-600">Descrição</label>
                        <p className="text-gray-900 font-medium">{produto.produtoDetalhes.descricao}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Informações Financeiras */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              Informações Financeiras
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Valor Total da Venda</label>
                <p className="text-3xl font-bold text-green-600">R$ {venda.valorTotal.toFixed(2)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Total de Produtos</label>
                <p className="text-gray-900 font-medium">{venda.produtos.reduce((acc, p) => acc + p.quantidade, 0)} unidades</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Forma de Pagamento</label>
                <p className="text-gray-900 font-medium capitalize">{venda.formaPagamento.replace(/_/g,' + ')}</p>
              </div>
              {(venda.valorPix || venda.valorCartao || venda.valorDinheiro) && (
                <div className="sm:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Valor PIX</label>
                    <p className="text-gray-900 font-medium">{venda.valorPix != null ? `R$ ${Number(venda.valorPix).toFixed(2)}` : '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Valor Cartão</label>
                    <p className="text-gray-900 font-medium">{venda.valorCartao != null ? `R$ ${Number(venda.valorCartao).toFixed(2)}` : '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Valor Dinheiro</label>
                    <p className="text-gray-900 font-medium">{venda.valorDinheiro != null ? `R$ ${Number(venda.valorDinheiro).toFixed(2)}` : '-'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Informações do Vendedor */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Informações do Vendedor
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Nome</label>
                <p className="text-gray-900 font-medium">{venda.vendedorNome}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <p className="text-gray-900 font-medium">{venda.vendedorEmail}</p>
              </div>
            </div>
          </div>

          {/* Data e Observações */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Data e Observações
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Data da Venda</label>
                <p className="text-gray-900 font-medium">{formatDate(venda.createdAt)}</p>
              </div>
              {venda.observacoes && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Observações</label>
                  <p className="text-gray-900 font-medium bg-gray-50 p-3 rounded-lg border">
                    {venda.observacoes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Troca de Produto */}
      {modalTrocaAberto && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-200">
            {/* Header do Modal */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Trocar Produto</h3>
                    <p className="text-sm text-gray-600">Substituir produto da venda</p>
                  </div>
                </div>
                <button
                  onClick={fecharModalTroca}
                  className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors group"
                  disabled={processandoTroca}
                >
                  <svg className="w-4 h-4 text-gray-500 group-hover:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Corpo do Modal */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Produto Atual */}
              {produtoSelecionado && (
                <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">Produto Atual (será devolvido ao estoque)</h4>
                      <p className="text-gray-800 font-medium">{produtoSelecionado.produtoNome}</p>
                      <p className="text-sm text-gray-600 mt-1">Quantidade: {produtoSelecionado.quantidade} unidades</p>
                      {produtoSelecionado.produtoDetalhes?.imei && (
                        <p className="text-sm text-gray-600">IMEI: {produtoSelecionado.produtoDetalhes.imei}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Busca */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🔍 Buscar Produto para Substituir
                </label>
                <input
                  type="text"
                  value={buscaEstoque}
                  onChange={(e) => setBuscaEstoque(e.target.value)}
                  placeholder="Digite o nome, IMEI, código de barras ou cor..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 font-medium transition-all duration-200 hover:border-gray-300"
                />
              </div>

              {/* Lista de Produtos Disponíveis */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📦 Selecione o Novo Produto
                </label>
                
                {carregandoEstoque ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando produtos disponíveis...</p>
                  </div>
                ) : produtosFiltrados.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">
                    Nenhum produto disponível no estoque
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto border-2 border-gray-200 rounded-xl p-3 bg-gray-50">
                    {produtosFiltrados.map((produto) => (
                      <button
                        key={produto.id}
                        onClick={() => setNovoProdutoId(produto.id)}
                        className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                          novoProdutoId === produto.id
                            ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-500 shadow-md'
                            : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">{produto.produtoNome}</p>
                            <div className="text-sm text-gray-600 mt-1">
                              {produto.imei && <span className="mr-3">IMEI: {produto.imei}</span>}
                              {produto.codigoBarras && <span className="mr-3">Código: {produto.codigoBarras}</span>}
                              {produto.cor && <span className="mr-3">Cor: {produto.cor}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              R$ {produto.preco.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Estoque: {produto.quantidade}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Produto Selecionado */}
              {produtoSelecionadoDetalhes && (
                <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">Novo Produto Selecionado</h4>
                      <p className="text-gray-800 font-medium">{produtoSelecionadoDetalhes.produtoNome}</p>
                      <p className="text-sm text-gray-600 mt-1">Preço: R$ {produtoSelecionadoDetalhes.preco.toFixed(2)}</p>
                      {produtoSelecionadoDetalhes.imei && (
                        <p className="text-sm text-gray-600">IMEI: {produtoSelecionadoDetalhes.imei}</p>
                      )}
                      {produtoSelecionadoDetalhes.codigoBarras && (
                        <p className="text-sm text-gray-600">Código de Barras: {produtoSelecionadoDetalhes.codigoBarras}</p>
                      )}
                      <p className="text-sm text-gray-600">Disponível: {produtoSelecionadoDetalhes.quantidade} unidades</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Preço Personalizado (Opcional) */}
              {novoProdutoId && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    💵 Preço Personalizado (Opcional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={precoPersonalizado}
                    onChange={(e) => setPrecoPersonalizado(e.target.value)}
                    placeholder={`Deixe vazio para usar R$ ${produtoSelecionadoDetalhes?.preco.toFixed(2)}`}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 font-medium transition-all duration-200 hover:border-gray-300"
                  />
                  <p className="text-xs text-gray-600 mt-2 bg-purple-50 p-2 rounded-lg border border-purple-100">
                    💡 Se deixar vazio, será usado o preço padrão do produto
                  </p>
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex space-x-3">
                <button
                  onClick={fecharModalTroca}
                  disabled={processandoTroca}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-semibold hover:shadow-md disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarTroca}
                  disabled={!novoProdutoId || processandoTroca}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transform hover:scale-105"
                >
                  {processandoTroca ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Processando...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      <span>Confirmar Troca</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
