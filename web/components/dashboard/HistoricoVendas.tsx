'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { HistoricoVenda } from '@/types/venda'
import { formatDate, formatCurrency } from '@/lib/formatters'
import { HistoricoVendasProps } from '@/types/components'

export default function HistoricoVendas({ usuarioId }: HistoricoVendasProps) {
  const [vendas, setVendas] = useState<HistoricoVenda[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [totalVendas, setTotalVendas] = useState(0)
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [ordenacao, setOrdenacao] = useState<'mais-recente' | 'mais-antigo' | 'maior-valor' | 'menor-valor'>('mais-recente')
  const router = useRouter()
  const itensPorPagina = 10

  const carregarHistorico = useCallback(async () => {
    try {
      setLoading(true)
      const { saleApi } = await import('@/lib/api')
      const response = await saleApi.historico({
        pagina: paginaAtual,
        limite: itensPorPagina,
        ordenacao,
        usuarioId,
        cliente: filtroCliente || undefined,
        dataInicio: filtroDataInicio || undefined,
        dataFim: filtroDataFim || undefined,
      })

      if (response.success && response.data) {
        setVendas(response.data)
        setTotalPaginas(response.paginacao?.totalPaginas || 1)
        setTotalVendas(response.paginacao?.total || 0)
      } else {
        setError(response.message || 'Erro ao carregar histórico')
      }
    } catch (error) {
      setError('Erro interno do servidor')
    } finally {
      setLoading(false)
    }
  }, [paginaAtual, ordenacao, filtroCliente, filtroDataInicio, filtroDataFim, usuarioId])

  useEffect(() => {
    carregarHistorico()
  }, [carregarHistorico])

  const limparFiltros = () => {
    setFiltroCliente('')
    setFiltroDataInicio('')
    setFiltroDataFim('')
    setPaginaAtual(1)
  }

  const verDetalhesVenda = (vendaId: number) => {
    router.push(`/dashboard/venda/${vendaId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando histórico...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">📊 Meu Histórico de Vendas</h3>
        <p className="text-gray-600">Acompanhe todas as suas vendas realizadas</p>
      </div>

      {/* Filtros Avançados */}
      <div className="bg-gray-50 rounded-xl p-4 mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">Filtros Avançados</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Nome do Cliente
            </label>
            <input
              type="text"
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              placeholder="Buscar por cliente..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 placeholder-gray-500"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={filtroDataInicio}
              onChange={(e) => setFiltroDataInicio(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Data Fim
            </label>
            <input
              type="date"
              value={filtroDataFim}
              onChange={(e) => setFiltroDataFim(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Ordenação
            </label>
            <select
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value as 'mais-recente' | 'mais-antigo' | 'maior-valor' | 'menor-valor')}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            >
              <option value="mais-recente">Mais Recente</option>
              <option value="mais-antigo">Mais Antigo</option>
              <option value="maior-valor">Maior Valor</option>
              <option value="menor-valor">Menor Valor</option>
            </select>
          </div>
        </div>
        
        <div className="flex justify-end mt-4">
          <button
            onClick={limparFiltros}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Lista de Vendas */}
      {error ? (
        <div className="text-center py-8">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-red-600">{error}</p>
        </div>
      ) : vendas.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filtroCliente || filtroDataInicio || filtroDataFim ? 'Nenhuma venda encontrada' : 'Nenhuma venda realizada'}
          </h3>
          <p className="text-gray-500">
            {filtroCliente || filtroDataInicio || filtroDataFim 
              ? 'Tente ajustar os filtros de busca' 
              : 'Suas vendas aparecerão aqui quando você começar a vender'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {vendas.map((venda) => (
            <div key={venda.vendaId} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{venda.clienteNome}</h4>
                  <p className="text-sm text-gray-600">{venda.telefone}</p>
                </div>
                <div className="mt-2 sm:mt-0 text-right">
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(venda.valorTotal)}</p>
                  <p className="text-sm text-gray-500">{formatDate(venda.createdAt)}</p>
                </div>
              </div>

              {/* Lista de produtos */}
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Produtos ({venda.produtos.length})
                </p>
                <div className="space-y-2">
                  {venda.produtos.map((produto) => (
                    <div key={produto.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{produto.produtoNome}</p>
                          <p className="text-xs text-gray-500">Preço unitário: {formatCurrency(produto.precoUnitario)}</p>
                        </div>
                        {venda.fotoProduto && produto === venda.produtos[0] && (
                          <button
                            onClick={() => window.open(venda.fotoProduto, '_blank')}
                            className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                            title="Ver foto do produto"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {produto.quantidade}x
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(produto.precoUnitario)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {venda.observacoes && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Observações</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{venda.observacoes}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Venda ID: {venda.vendaId}
                </div>
                <button
                  onClick={() => verDetalhesVenda(venda.produtos[0].id)}
                  className="px-4 py-2 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-200 transition-colors"
                >
                  Ver Detalhes
                </button>
              </div>
            </div>
          ))}
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
              {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                const pagina = i + 1
                return (
                  <button
                    key={pagina}
                    onClick={() => setPaginaAtual(pagina)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg ${
                      pagina === paginaAtual
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pagina}
                  </button>
                )
              })}
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
  )
}
