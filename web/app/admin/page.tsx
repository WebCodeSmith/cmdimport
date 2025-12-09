'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter'
import { useToastContext } from '@/contexts/ToastContext'
import { productApi, authApi } from '@/lib/api'
import HistoricoVendas from '@/components/admin/HistoricoVendas'
import CadastrarProdutoSection from '@/components/admin/CadastrarProdutoSection'
import ListarProdutosComprados from '@/components/admin/ListarProdutosComprados'
import EstoqueUsuarios from '@/components/admin/EstoqueUsuarios'

interface ProdutoComprado {
  id: number
  nome: string
  descricao?: string
  cor?: string
  imei?: string
  codigoBarras?: string
  custoDolar: number
  taxaDolar: number
  preco: number
  quantidade: number
  fornecedor?: string
  dataCompra: string
  createdAt: string
  valorAtacado?: number
  valorVarejo?: number
  valorParcelado10x?: number
  estoque: Array<{
    id: number
    quantidade: number
    ativo: boolean
  }>
}

export default function AdminPage() {
  const { user, logout, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToastContext()
  const [loading, setLoading] = useState(true)
  
  const getInitialTab = (): 'historico' | 'cadastrar' | 'listar' | 'estoque' => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'cadastrar') return 'cadastrar'
    if (tabParam === 'listar') return 'listar'
    if (tabParam === 'estoque') return 'estoque'
    return 'historico'
  }
  
  const [activeTab, setActiveTab] = useState<'historico' | 'cadastrar' | 'listar' | 'estoque'>(getInitialTab())
  
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'cadastrar') {
      setActiveTab('cadastrar')
    } else if (tabParam === 'listar') {
      setActiveTab('listar')
    } else if (tabParam === 'estoque') {
      setActiveTab('estoque')
    } else {
      setActiveTab('historico')
    }
  }, [searchParams])
  const [modalPrecificacao, setModalPrecificacao] = useState(false)
  const [sidebarEdicao, setSidebarEdicao] = useState(false)
  const [modalDistribuicao, setModalDistribuicao] = useState(false)
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoComprado | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const [salvandoDistribuicao, setSalvandoDistribuicao] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const atualizarProdutoRef = useRef<((produto: ProdutoComprado) => void) | null>(null)
  
  // Estados para o formulário de edição
  const [formularioEdicao, setFormularioEdicao] = useState({
    nome: '',
    descricao: '',
    cor: '',
    imei: '',
    codigoBarras: '',
    custoDolar: '',
    taxaDolar: '',
    preco: '',
    quantidade: '',
    dataCompra: ''
  })

  // Estados para o formulário de distribuição
  const [formularioDistribuicao, setFormularioDistribuicao] = useState({
    atendenteId: '',
    quantidade: ''
  })
  const [atendentes, setAtendentes] = useState<Array<{id: number, nome: string, email: string, isAdmin: boolean}>>([])
  
  // Hooks para formatação de moeda
  const valorAtacado = useCurrencyFormatter()
  const valorVarejo = useCurrencyFormatter()
  const valorParcelado10x = useCurrencyFormatter()

  useEffect(() => {
    // Aguardar o carregamento da autenticação
    if (authLoading) {
      return
    }

    if (!user) {
      router.push('/')
      return
    }

    if (!user.isAdmin) {
      router.push('/dashboard')
      return
    }

    setLoading(false)
  }, [user, router, authLoading])


  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const abrirModalPrecificacao = (produto: ProdutoComprado) => {
    setProdutoSelecionado(produto)
    
    // Formatar valores existentes
    
    if (produto.valorAtacado) {
      valorAtacado.setValue(new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(produto.valorAtacado))
    } else {
      valorAtacado.setValue('')
    }
    
    if (produto.valorVarejo) {
      valorVarejo.setValue(new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(produto.valorVarejo))
    } else {
      valorVarejo.setValue('')
    }
    
    if (produto.valorParcelado10x) {
      valorParcelado10x.setValue(new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(produto.valorParcelado10x))
    } else {
      valorParcelado10x.setValue('')
    }
    
    setModalPrecificacao(true)
  }

  const fecharModalPrecificacao = () => {
    setModalPrecificacao(false)
    setProdutoSelecionado(null)
    valorAtacado.setValue('')
    valorVarejo.setValue('')
    valorParcelado10x.setValue('')
  }

  const salvarPrecificacao = async () => {
    if (!produtoSelecionado) return

    try {
      setSalvando(true)
      const response = await productApi.atualizarPrecificacao(produtoSelecionado.id, {
        valorAtacado: valorAtacado.getNumericValue(),
        valorVarejo: valorVarejo.getNumericValue(),
        valorParcelado10x: valorParcelado10x.getNumericValue()
      })

      if (response.success) {
        showToast('Precificação atualizada com sucesso!', 'success')
        fecharModalPrecificacao()
        // Forçar atualização do componente de listagem
        setRefreshKey(prev => prev + 1)
      } else {
        console.error('Erro ao salvar precificação:', response.message)
        showToast(response.message || 'Erro ao salvar precificação', 'error')
      }
    } catch (error) {
      console.error('Erro ao salvar precificação:', error)
      showToast('Erro de conexão. Tente novamente.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  const abrirSidebarEdicao = (produto: ProdutoComprado) => {
    setProdutoSelecionado(produto)
    
    // Preencher o formulário com os dados atuais do produto
    setFormularioEdicao({
      nome: produto.nome,
      descricao: produto.descricao || '',
      cor: produto.cor || '',
      imei: produto.imei || '',
      codigoBarras: produto.codigoBarras || '',
      custoDolar: produto.custoDolar.toString(),
      taxaDolar: produto.taxaDolar.toString(),
      preco: produto.preco.toString(),
      quantidade: produto.quantidade.toString(),
      dataCompra: produto.dataCompra ? new Date(produto.dataCompra).toISOString().split('T')[0] : ''
    })
    
    setSidebarEdicao(true)
  }

  const fecharSidebarEdicao = () => {
    setSidebarEdicao(false)
    setProdutoSelecionado(null)
    setFormularioEdicao({
      nome: '',
      descricao: '',
      cor: '',
      imei: '',
      codigoBarras: '',
      custoDolar: '',
      taxaDolar: '',
      preco: '',
      quantidade: '',
      dataCompra: ''
    })
  }

  const salvarEdicao = async () => {
    if (!produtoSelecionado) return

    try {
      setSalvandoEdicao(true)
      
      // Preparar dados - backend aceita strings e números, então enviamos direto
      const dadosAtualizacao: any = {}
      
      // Campos de texto
      if (formularioEdicao.nome?.trim()) {
        dadosAtualizacao.nome = formularioEdicao.nome.trim()
      }
      // Descrição - sempre enviar para permitir apagar (mesmo se vazio)
      if (formularioEdicao.descricao !== undefined) {
        dadosAtualizacao.descricao = formularioEdicao.descricao.trim() || null
      }
      // Permitir limpar campos opcionais
      if (formularioEdicao.cor !== undefined) {
        dadosAtualizacao.cor = formularioEdicao.cor.trim() || null
      }
      if (formularioEdicao.imei !== undefined) {
        dadosAtualizacao.imei = formularioEdicao.imei.trim() || null
      }
      if (formularioEdicao.codigoBarras !== undefined) {
        dadosAtualizacao.codigoBarras = formularioEdicao.codigoBarras.trim() || null
      }
      if (formularioEdicao.dataCompra?.trim()) {
        dadosAtualizacao.dataCompra = formularioEdicao.dataCompra.trim()
      }
      
      // Campos numéricos - backend aceita strings (formato brasileiro com vírgula)
      if (formularioEdicao.custoDolar?.trim()) {
        dadosAtualizacao.custoDolar = formularioEdicao.custoDolar.trim()
      }
      if (formularioEdicao.taxaDolar?.trim()) {
        dadosAtualizacao.taxaDolar = formularioEdicao.taxaDolar.trim()
      }
      if (formularioEdicao.preco?.trim()) {
        dadosAtualizacao.preco = formularioEdicao.preco.trim()
      }
      if (formularioEdicao.quantidade?.trim()) {
        dadosAtualizacao.quantidade = formularioEdicao.quantidade.trim()
      }
      
      const response = await productApi.atualizar(produtoSelecionado.id, dadosAtualizacao)

      if (response.success) {
        showToast('Produto atualizado com sucesso!', 'success')
        fecharSidebarEdicao()
        
        // Buscar produto atualizado do backend
        try {
          const produtoAtualizadoResponse = await productApi.buscarPorID(produtoSelecionado.id)
          if (produtoAtualizadoResponse.success && produtoAtualizadoResponse.data) {
            // Atualizar produto no estado local sem recarregar a página
            if (atualizarProdutoRef.current) {
              atualizarProdutoRef.current(produtoAtualizadoResponse.data)
            } else {
              // Fallback: recarregar se a função não estiver disponível
              setRefreshKey(prev => prev + 1)
            }
          } else {
            // Fallback: recarregar se não conseguir buscar o produto atualizado
            setRefreshKey(prev => prev + 1)
          }
        } catch (error) {
          console.error('Erro ao buscar produto atualizado:', error)
          // Fallback: recarregar em caso de erro
          setRefreshKey(prev => prev + 1)
        }
      } else {
        console.error('Erro ao salvar edição:', response.message)
        showToast(response.message || 'Erro ao salvar as alterações', 'error')
      }
    } catch (error) {
      console.error('Erro ao salvar edição:', error)
      showToast('Erro de conexão. Tente novamente.', 'error')
    } finally {
      setSalvandoEdicao(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormularioEdicao(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const abrirModalDistribuicao = async (produto: ProdutoComprado) => {
    setProdutoSelecionado(produto)
    
    // Carregar lista de atendentes
    try {
      const response = await authApi.listarAtendentes()
      if (response.success) {
        setAtendentes(response.data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar atendentes:', error)
    }
    
    // Resetar formulário
    setFormularioDistribuicao({
      atendenteId: '',
      quantidade: ''
    })
    
    setModalDistribuicao(true)
  }

  const fecharModalDistribuicao = () => {
    setModalDistribuicao(false)
    setProdutoSelecionado(null)
    setFormularioDistribuicao({
      atendenteId: '',
      quantidade: ''
    })
  }

  const salvarDistribuicao = async () => {
    if (!produtoSelecionado || !formularioDistribuicao.atendenteId || !formularioDistribuicao.quantidade) return

    try {
      setSalvandoDistribuicao(true)
      const response = await productApi.distribuir({
        produtoId: produtoSelecionado.id,
        atendenteId: parseInt(formularioDistribuicao.atendenteId),
        quantidade: parseInt(formularioDistribuicao.quantidade)
      })


      if (response.success) {
        showToast(
          `Produto distribuído com sucesso! ${produtoSelecionado.nome} - Quantidade: ${formularioDistribuicao.quantidade} - Para: ${response.data?.atendente || 'Atendente'}`,
          'success'
        )
        fecharModalDistribuicao()
        // Forçar atualização dos componentes filhos
        setRefreshKey(prev => prev + 1)
      } else {
        console.error('Erro ao distribuir produto:', response.message)
        showToast(response.message || 'Erro ao distribuir produto', 'error')
      }
    } catch (error) {
      console.error('Erro ao distribuir produto:', error)
      showToast('Erro de conexão. Tente novamente.', 'error')
    } finally {
      setSalvandoDistribuicao(false)
    }
  }

  const handleDistribuicaoChange = (field: string, value: string) => {
    setFormularioDistribuicao(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Welcome Section */}
      <div className={`mb-6 transition-all duration-300 ${modalPrecificacao || sidebarEdicao || modalDistribuicao ? 'pr-80' : ''}`}>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          Painel Administrativo 🔐
        </h1>
        <p className="text-gray-600 text-sm">
          Gerencie o histórico de vendas e monitore a atividade dos vendedores
        </p>
      </div>

        {/* Stats Cards */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 transition-all duration-300 ${modalPrecificacao || sidebarEdicao || modalDistribuicao ? 'pr-80' : ''}`}>
          <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Vendas</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Vendedores Ativos</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Receita Total</p>
                <p className="text-2xl font-bold text-gray-900">R$ 0,00</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-300 ${modalPrecificacao || sidebarEdicao || modalDistribuicao ? 'mr-80' : ''}`}>
          {activeTab === 'historico' && <HistoricoVendas />}
          {activeTab === 'cadastrar' && <CadastrarProdutoSection />}
          {activeTab === 'listar' && <ListarProdutosComprados onAbrirPrecificacao={abrirModalPrecificacao} onEditarProduto={abrirSidebarEdicao} onDistribuirProduto={abrirModalDistribuicao} onProdutoAtualizado={(atualizarFuncao) => { atualizarProdutoRef.current = atualizarFuncao }} />}
          {activeTab === 'estoque' && <EstoqueUsuarios />}
        </div>

      {/* Sidebar de Precificação */}
      <div className={`fixed top-16 right-0 h-[calc(100vh-4rem)] w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-40 border-l border-gray-200 ${
        modalPrecificacao ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="h-full flex flex-col">
          {/* Header do Sidebar */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-xl">💰</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Precificação</h3>
                <p className="text-sm text-gray-600">Defina os valores de venda</p>
              </div>
            </div>
            <button
              onClick={fecharModalPrecificacao}
              className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors group"
            >
              <svg className="w-4 h-4 text-gray-500 group-hover:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Conteúdo do Sidebar */}
          <div className="flex-1 overflow-y-auto p-6">
            {produtoSelecionado && (
              <>
                {/* Informações do Produto */}
              <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">{produtoSelecionado.nome}</h4>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Estoque: {(produtoSelecionado.estoque || []).reduce((total, item) => total + item.quantidade, 0)} unidades</span>
                </div>
                  {produtoSelecionado.cor && (
                    <div className="mt-2">
                      <span className="text-xs font-medium text-gray-500">Cor: </span>
                      <span className="text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded">{produtoSelecionado.cor}</span>
                    </div>
                  )}
                </div>

                {/* Campos de Precificação */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      🏢 Valor de Venda para Atacado
                    </label>
                    <input
                      type="text"
                      value={valorAtacado.value}
                      onChange={(e) => valorAtacado.handleChange(e.target.value)}
                      placeholder="0,00"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium transition-all duration-200 hover:border-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      🛍️ Valor para Venda do Varejo
                    </label>
                    <input
                      type="text"
                      value={valorVarejo.value}
                      onChange={(e) => valorVarejo.handleChange(e.target.value)}
                      placeholder="0,00"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium transition-all duration-200 hover:border-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📅 Valor Parcelado 10x
                    </label>
                    <input
                      type="text"
                      value={valorParcelado10x.value}
                      onChange={(e) => valorParcelado10x.handleChange(e.target.value)}
                      placeholder="0,00"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium transition-all duration-200 hover:border-gray-300"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer do Sidebar */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex space-x-3">
              <button
                onClick={fecharModalPrecificacao}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-semibold hover:shadow-md"
              >
                Cancelar
              </button>
              <button
                onClick={salvarPrecificacao}
                disabled={salvando}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transform hover:scale-105"
              >
                {salvando ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Salvando...</span>
                  </div>
                ) : (
                  '💾 Salvar'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar de Edição */}
      <div className={`fixed top-16 right-0 h-[calc(100vh-4rem)] w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-40 border-l border-gray-200 ${
        sidebarEdicao ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="h-full flex flex-col">
          {/* Header do Sidebar */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Editar Produto</h3>
                <p className="text-sm text-gray-600">Modifique as informações do produto</p>
              </div>
            </div>
            <button
              onClick={fecharSidebarEdicao}
              className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors group"
            >
              <svg className="w-4 h-4 text-gray-500 group-hover:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Conteúdo do Sidebar */}
          <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Nome do Produto */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📱 Nome do Produto *
                  </label>
                  <input
                    type="text"
                    value={formularioEdicao.nome}
                    onChange={(e) => handleInputChange('nome', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium transition-all duration-200"
                    placeholder="Ex: iPhone 15 Pro Max"
                    required
                  />
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📝 Descrição
                  </label>
                  <textarea
                    value={formularioEdicao.descricao}
                    onChange={(e) => handleInputChange('descricao', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium transition-all duration-200"
                    placeholder="Descrição detalhada do produto"
                    rows={3}
                  />
                </div>

                {/* Cor */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    🎨 Cor
                  </label>
                  <input
                    type="text"
                    value={formularioEdicao.cor}
                    onChange={(e) => handleInputChange('cor', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium transition-all duration-200"
                    placeholder="Ex: Preto, Branco, Azul"
                  />
                </div>

                {/* IMEI */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    🔢 IMEI
                  </label>
                  <input
                    type="text"
                    value={formularioEdicao.imei}
                    onChange={(e) => handleInputChange('imei', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium transition-all duration-200"
                    placeholder="Número do IMEI"
                  />
                </div>

                {/* Código de Barras */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📊 Código de Barras
                  </label>
                  <input
                    type="text"
                    value={formularioEdicao.codigoBarras}
                    onChange={(e) => handleInputChange('codigoBarras', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium transition-all duration-200"
                    placeholder="Código de barras do produto"
                  />
                </div>

                {/* Custo em Dólar */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    💵 Custo em Dólar ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formularioEdicao.custoDolar}
                    onChange={(e) => handleInputChange('custoDolar', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium transition-all duration-200"
                    placeholder="0.00"
                    required
                  />
                </div>

                {/* Taxa do Dólar */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📈 Taxa do Dólar (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formularioEdicao.taxaDolar}
                    onChange={(e) => handleInputChange('taxaDolar', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium transition-all duration-200"
                    placeholder="0.0000"
                    required
                  />
                </div>

                {/* Preço Final */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    💰 Preço Final (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formularioEdicao.preco}
                    onChange={(e) => handleInputChange('preco', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium transition-all duration-200"
                    placeholder="0.00"
                    required
                  />
                </div>

                {/* Quantidade */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📦 Quantidade *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formularioEdicao.quantidade}
                    onChange={(e) => handleInputChange('quantidade', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium transition-all duration-200"
                    placeholder="1"
                    required
                  />
                </div>


                {/* Data da Compra */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📅 Data da Compra *
                  </label>
                  <input
                    type="date"
                    value={formularioEdicao.dataCompra}
                    onChange={(e) => handleInputChange('dataCompra', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium transition-all duration-200"
                    required
                  />
                </div>
              </div>
          </div>

          {/* Footer do Sidebar */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="space-y-3">
              <button
                onClick={salvarEdicao}
                disabled={salvandoEdicao || !formularioEdicao.nome || !formularioEdicao.custoDolar || !formularioEdicao.taxaDolar || !formularioEdicao.preco || !formularioEdicao.quantidade || !formularioEdicao.dataCompra}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transform hover:scale-105"
              >
                {salvandoEdicao ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Salvando...</span>
                  </div>
                ) : (
                  '💾 Salvar Alterações'
                )}
              </button>
              <button
                onClick={fecharSidebarEdicao}
                className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-semibold hover:shadow-md"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar de Distribuição */}
      <div className={`fixed top-16 right-0 h-[calc(100vh-4rem)] w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-40 border-l border-gray-200 ${
        modalDistribuicao ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="h-full flex flex-col">
          {/* Header do Sidebar */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Distribuir Produto</h3>
                <p className="text-sm text-gray-600">Atribuir produto a um atendente</p>
              </div>
            </div>
            <button
              onClick={fecharModalDistribuicao}
              className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors group"
            >
              <svg className="w-4 h-4 text-gray-500 group-hover:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Conteúdo do Sidebar */}
          <div className="flex-1 overflow-y-auto p-6">
            {produtoSelecionado && (
              <>
                {/* Informações do Produto */}
                <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">{produtoSelecionado.nome}</h4>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Quantidade: {produtoSelecionado.quantidade} unidades</span>
                  </div>
                  {produtoSelecionado.cor && (
                    <div className="mt-2">
                      <span className="text-xs font-medium text-gray-500">Cor: </span>
                      <span className="text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded">{produtoSelecionado.cor}</span>
                    </div>
                  )}
                </div>

                {/* Campos de Distribuição */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      👤 Atendente *
                    </label>
                    <select
                      value={formularioDistribuicao.atendenteId}
                      onChange={(e) => handleDistribuicaoChange('atendenteId', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 font-medium transition-all duration-200"
                      required
                    >
                      <option value="">Selecione um atendente</option>
                      {atendentes.map((atendente) => (
                        <option key={atendente.id} value={atendente.id}>
                          {atendente.nome} {atendente.isAdmin ? '(Admin)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📦 Quantidade *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={produtoSelecionado.quantidade}
                      value={formularioDistribuicao.quantidade}
                      onChange={(e) => handleDistribuicaoChange('quantidade', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 font-medium transition-all duration-200"
                      placeholder="1"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Máximo: {produtoSelecionado.quantidade} unidades
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer do Sidebar */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex space-x-3">
              <button
                onClick={fecharModalDistribuicao}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-semibold hover:shadow-md"
              >
                Cancelar
              </button>
              <button
                onClick={salvarDistribuicao}
                disabled={salvandoDistribuicao || !formularioDistribuicao.atendenteId || !formularioDistribuicao.quantidade}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transform hover:scale-105"
              >
                {salvandoDistribuicao ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Distribuindo...</span>
                  </div>
                ) : (
                  '🎯 Distribuir'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
