'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { HistoricoVenda } from '@/types/venda'
import { formatDate, formatPhone } from '@/lib/formatters'

export default function HistoricoVendedorPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [vendas, setVendas] = useState<HistoricoVenda[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [ordenacao, setOrdenacao] = useState<'data' | 'valor'>('data')
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [totalVendas, setTotalVendas] = useState(0)
  const itensPorPagina = 10

  const carregarHistorico = useCallback(async () => {
    try {
      setLoading(true)
      const { saleApi } = await import('@/lib/api')
      const response = await saleApi.historico({
        pagina: paginaAtual,
        limite: itensPorPagina,
        ordenacao: ordenacao === 'data' ? 'mais-recente' : 'maior-valor',
        usuarioId: user?.id,
        cliente: filtroCliente || undefined,
        dataInicio: filtroDataInicio || undefined,
        dataFim: filtroDataFim || undefined,
      })
      
      if (response.success && response.data) {
        setVendas(response.data as any)
        if (response.paginacao) {
          setTotalPaginas(response.paginacao.totalPaginas)
          setTotalVendas(response.paginacao.total)
        }
      } else {
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }, [paginaAtual, ordenacao, filtroCliente, filtroDataInicio, filtroDataFim, user])

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }

    carregarHistorico()
  }, [user, router, carregarHistorico])

  const limparFiltros = () => {
    setFiltroCliente('')
    setFiltroDataInicio('')
    setFiltroDataFim('')
    setPaginaAtual(1)
  }

  const abrirDetalhes = (vendaId: number) => {
    router.push(`/dashboard/venda/${vendaId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando seu histórico...</p>
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
                onClick={() => router.push('/dashboard')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900">📊 Meu Histórico de Vendas</h1>
            </div>
            <div className="text-sm text-gray-600">
              Olá, {user?.nome}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtros Avançados */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar por cliente
              </label>
              <input
                type="text"
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
                placeholder="Digite o nome do cliente..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data início
              </label>
              <input
                type="date"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data fim
              </label>
              <input
                type="date"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ordenar por
              </label>
              <select
                value={ordenacao}
                onChange={(e) => setOrdenacao(e.target.value as 'data' | 'valor')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
              >
                <option value="data">Data</option>
                <option value="valor">Valor</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={limparFiltros}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Vendas</p>
                <p className="text-2xl font-bold text-gray-900">{vendas.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  R$ {vendas.reduce((total, venda) => total + venda.valorTotal, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
                <p className="text-2xl font-bold text-gray-900">
                  R$ {vendas.length > 0 ? (vendas.reduce((total, venda) => total + venda.valorTotal, 0) / vendas.length).toFixed(2) : '0,00'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Vendas */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Suas Vendas</h2>
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-6 font-medium text-gray-700">Cliente</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">Produto</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">Qtd</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">Valor</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">Data</th>
                </tr>
              </thead>
              <tbody>
                {vendas.map((venda) => (
                  <tr 
                    key={venda.vendaId} 
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => abrirDetalhes(venda.produtos[0].id)}
                  >
                    <td className="py-3 px-6">
                      <div className="font-medium text-gray-900">{venda.clienteNome}</div>
                      <div className="text-sm text-gray-500">{formatPhone(venda.telefone)}</div>
                    </td>
                    <td className="py-3 px-6">
                      <div className="font-medium text-gray-900">{venda.produtos[0].produtoNome}</div>
                    </td>
                    <td className="py-3 px-6">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {venda.produtos[0].quantidade}
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      <div className="font-medium text-gray-900">R$ {venda.valorTotal.toFixed(2)}</div>
                    </td>
                    <td className="py-3 px-6">
                      <div className="text-sm text-gray-900">{formatDate(venda.createdAt)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden">
            {vendas.map((venda) => (
              <div 
                key={venda.vendaId} 
                className="p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => abrirDetalhes(venda.produtos[0].id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">{venda.clienteNome}</h4>
                    <p className="text-sm text-gray-600">{venda.produtos[0].produtoNome}</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    R$ {venda.valorTotal.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Qtd: {venda.produtos[0].quantidade}</span>
                  <span>{formatDate(venda.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>

          {vendas.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Nenhuma venda encontrada</h4>
              <p className="text-gray-600">
                {filtroCliente || filtroDataInicio || filtroDataFim ? 'Tente ajustar os filtros de busca.' : 'Você ainda não realizou nenhuma venda.'}
              </p>
            </div>
          )}

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, totalVendas)} de {totalVendas} vendas
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPaginaAtual(paginaAtual - 1)}
                  disabled={paginaAtual === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                
                <div className="flex space-x-1">
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pagina) => (
                    <button
                      key={pagina}
                      onClick={() => setPaginaAtual(pagina)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg ${
                        pagina === paginaAtual
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pagina}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => setPaginaAtual(paginaAtual + 1)}
                  disabled={paginaAtual === totalPaginas}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
