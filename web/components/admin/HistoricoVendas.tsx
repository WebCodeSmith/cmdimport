'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { HistoricoVenda, ProdutoItem, VendaExport } from '@/types/venda'
import * as XLSX from 'xlsx'
import { formatDate, formatPhone, formatCurrency, formatNumber } from '@/lib/formatters'

export default function HistoricoVendas() {
  const router = useRouter()
  const [vendas, setVendas] = useState<HistoricoVenda[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [filtroImeiCodigo, setFiltroImeiCodigo] = useState('')
  const [ordenacao, setOrdenacao] = useState<'data' | 'valor' | 'vendedor'>('data')
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [totalVendas, setTotalVendas] = useState(0)
  const [abaAtiva, setAbaAtiva] = useState<'historico' | 'resumo'>('historico')
  const [resumoVendedores, setResumoVendedores] = useState<Array<{
    vendedorNome: string
    vendedorEmail: string
    totalVendas: number
    totalValor: number
    quantidadeProdutos: number
  }>>([])
  const [exportando, setExportando] = useState(false)
  const itensPorPagina = 10

  const carregarHistorico = useCallback(async () => {
    try {
      setLoading(true)
      const { saleApi } = await import('@/lib/api')
      const response = await saleApi.historicoAdmin({
        pagina: paginaAtual,
        limite: itensPorPagina,
        ordenacao,
        cliente: filtroCliente || undefined,
        imeiCodigo: filtroImeiCodigo || undefined,
        dataInicio: filtroDataInicio || undefined,
        dataFim: filtroDataFim || undefined,
      })
      
      if (response.success && response.data) {
        setVendas(response.data)
        setTotalPaginas(response.paginacao?.totalPaginas || 1)
        setTotalVendas(response.paginacao?.total || 0)
      } else {
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }, [paginaAtual, ordenacao, filtroCliente, filtroDataInicio, filtroDataFim, filtroImeiCodigo])

  const carregarResumoVendedores = useCallback(async () => {
    try {
      setLoading(true)
      const { saleApi } = await import('@/lib/api')
      const response = await saleApi.resumoVendedores({
        dataInicio: filtroDataInicio || undefined,
        dataFim: filtroDataFim || undefined,
      })
      
      if (response.success && response.data) {
        setResumoVendedores(response.data)
      } else {
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }, [filtroDataInicio, filtroDataFim])

  useEffect(() => {
    if (abaAtiva === 'historico') {
      carregarHistorico()
    } else {
      carregarResumoVendedores()
    }
  }, [abaAtiva, carregarHistorico, carregarResumoVendedores])

  const limparFiltros = () => {
    setFiltroCliente('')
    setFiltroDataInicio('')
    setFiltroDataFim('')
    setFiltroImeiCodigo('')
    setPaginaAtual(1)
  }

  const exportarHistorico = async () => {
    try {
      setExportando(true)
      
      // Buscar todas as vendas fazendo requisições paginadas
      const { saleApi } = await import('@/lib/api')
      const todasVendas: any[] = []
      let pagina = 1
      const limitePorLote = 100 // Buscar 100 vendas por vez
      let temMaisVendas = true
      
      // Buscar todas as vendas em lotes
      while (temMaisVendas) {
        const response = await saleApi.historicoAdmin({
          pagina,
          limite: limitePorLote,
          ordenacao,
          cliente: filtroCliente || undefined,
          imeiCodigo: filtroImeiCodigo || undefined,
          dataInicio: filtroDataInicio || undefined,
          dataFim: filtroDataFim || undefined,
        })
        
        if (!response.success) {
          throw new Error(response.message || 'Erro ao buscar vendas')
        }
        
        if (response.data && response.data.length > 0) {
          todasVendas.push(...response.data)
          
          // Verificar se há mais vendas
          const totalPaginas = response.paginacao?.totalPaginas || 1
          temMaisVendas = pagina < totalPaginas
          pagina++
        } else {
          temMaisVendas = false
        }
      }
      
      if (todasVendas.length === 0) {
        throw new Error('Nenhuma venda encontrada para exportar')
      }

      const vendasExport = todasVendas as Array<VendaExport>

      // Criar uma linha para cada produto vendido (igual à exportação de produtos comprados)
      const linhas: Array<Record<string, string | number>> = []
      
      vendasExport.forEach((venda: VendaExport) => {
        const produtos = venda.produtos || []
        
        if (produtos.length === 0) {
          // Se não há produtos, criar uma linha só com dados da venda
          linhas.push({
            'ID da Venda': venda.vendaId || '',
            'ID do Produto': '',
            'Cliente': venda.clienteNome || '',
            'Telefone': venda.telefone || '',
            'Endereço': venda.endereco || '',
            'Tipo de Cliente': venda.tipoCliente === 'lojista' ? '🏢 Lojista' : venda.tipoCliente === 'consumidor' ? '🛍️ Consumidor' : '',
            'Produto': '',
            'Quantidade': 0,
              'Preço Unitário': '',
              'Subtotal': '',
              'Forma de Pagamento': venda.formaPagamento || '',
            'Valor Pix': venda.valorPix != null ? Number(venda.valorPix).toFixed(2).replace('.', ',') : '',
            'Valor Cartão': venda.valorCartao != null ? Number(venda.valorCartao).toFixed(2).replace('.', ',') : '',
            'Valor Dinheiro': venda.valorDinheiro != null ? Number(venda.valorDinheiro).toFixed(2).replace('.', ',') : '',
            'Vendedor': venda.vendedorNome || '',
            'Data': venda.createdAt ? formatDate(venda.createdAt) : '',
            'Observações': venda.observacoes || ''
          })
        } else {
          // Criar uma linha para cada produto
          produtos.forEach((produto: ProdutoItem) => {
            linhas.push({
              'ID da Venda': venda.vendaId || '',
              'ID do Produto': produto.produtoId || '',
              'Cliente': venda.clienteNome || '',
              'Telefone': venda.telefone || '',
              'Endereço': venda.endereco || '',
              'Tipo de Cliente': venda.tipoCliente === 'lojista' ? '🏢 Lojista' : venda.tipoCliente === 'consumidor' ? '🛍️ Consumidor' : '',
              'Produto': produto.produtoNome || '',
              'Quantidade': produto.quantidade || 0,
              'Preço Unitário': Number(produto.precoUnitario || 0).toFixed(2).replace('.', ','),
              'Subtotal': (Number(produto.precoUnitario || 0) * produto.quantidade).toFixed(2).replace('.', ','),
              'Forma de Pagamento': venda.formaPagamento || '',
              'Valor Pix': venda.valorPix != null ? Number(venda.valorPix).toFixed(2).replace('.', ',') : '',
              'Valor Cartão': venda.valorCartao != null ? Number(venda.valorCartao).toFixed(2).replace('.', ',') : '',
              'Valor Dinheiro': venda.valorDinheiro != null ? Number(venda.valorDinheiro).toFixed(2).replace('.', ',') : '',
              'Vendedor': venda.vendedorNome || '',
              'Data': venda.createdAt ? formatDate(venda.createdAt) : '',
              'Observações': venda.observacoes || ''
            })
          })
        }
      })

      // Criar arquivo Excel (XLSX) com ajuste automático de colunas
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(linhas)
      
      // Obter headers das chaves dos dados
      const headers = Object.keys(linhas[0] || {})
      
      // Ajustar largura das colunas automaticamente
      const colWidths = headers.map((header: string) => {
        const maxLength = Math.max(
          header.length,
          ...linhas.map((row: Record<string, string | number>) => {
            const value = row[header]
            return value ? String(value).length : 0
          })
        )
        return { wch: Math.min(Math.max(maxLength + 2, 10), 50) } // Mínimo 10, máximo 50
      })
      
      worksheet['!cols'] = colWidths
      
      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Histórico de Vendas')
      
      // Gerar arquivo Excel
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      
      // Download do arquivo
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.href = url
      link.download = `historico_vendas_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      console.error('Erro ao exportar histórico:', e)
      alert('Erro ao exportar histórico. Tente novamente.')
    } finally {
      setExportando(false)
    }
  }

  const abrirDetalhes = (vendaId: number) => {
    router.push(`/admin/venda/${vendaId}`)
  }

  // Os filtros agora são aplicados no servidor, então usamos vendas diretamente
  const vendasFiltradas = vendas

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
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">📊 Histórico de Vendas</h3>
            <p className="text-gray-600">Todas as vendas realizadas pelos vendedores</p>
          </div>
          {abaAtiva === 'historico' && (
            <button
              onClick={exportarHistorico}
              disabled={exportando}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {exportando ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              <span>{exportando ? 'Exportando...' : 'Exportar Excel'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Abas */}
      <div className="bg-white border border-gray-200 rounded-xl mb-6 shadow-sm">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setAbaAtiva('historico')}
            className={`flex-1 px-4 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
              abaAtiva === 'historico'
                ? 'border-indigo-500 text-indigo-600 bg-indigo-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📋 Histórico Detalhado
          </button>
          <button
            onClick={() => setAbaAtiva('resumo')}
            className={`flex-1 px-4 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
              abaAtiva === 'resumo'
                ? 'border-indigo-500 text-indigo-600 bg-indigo-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📊 Resumo por Vendedor
          </button>
        </div>
      </div>

      {/* Conteúdo das Abas */}
      {abaAtiva === 'historico' && (
        <>
          {/* Filtros Avançados */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
              Buscar por IMEI ou código de barras
            </label>
            <input
              type="text"
              value={filtroImeiCodigo}
              onChange={(e) => setFiltroImeiCodigo(e.target.value)}
              placeholder="Digite IMEI ou código de barras..."
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
              onChange={(e) => setOrdenacao(e.target.value as 'data' | 'valor' | 'vendedor')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            >
              <option value="data">Data</option>
              <option value="valor">Valor</option>
              <option value="vendedor">Vendedor</option>
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

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-700">ID Venda</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Cliente</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Contato</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Produto</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Qtd</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Valor</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Vendedor</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">Data</th>
            </tr>
          </thead>
          <tbody>
            {vendasFiltradas.map((venda) => (
              <Fragment key={venda.vendaId}>
                {venda.produtos.map((produto, index) => (
                  <tr 
                    key={`${venda.vendaId}-${produto.id}`}
                    className={`border-b cursor-pointer transition-colors ${
                      venda.formaPagamento === 'crediario'
                        ? 'bg-red-50 border-red-200 hover:bg-red-100'
                        : 'border-gray-100 hover:bg-gray-50'
                    }`}
                    onClick={() => abrirDetalhes(produto.id)}
                  >
                    {index === 0 && (
                      <>
                        <td className="py-3 px-4" rowSpan={venda.produtos.length}>
                          <div className="text-sm font-mono text-gray-900">{venda.vendaId}</div>
                        </td>
                        <td className="py-3 px-4" rowSpan={venda.produtos.length}>
                          <div className="font-medium text-gray-900">{venda.clienteNome}</div>
                          <div className="text-sm text-gray-500">{venda.endereco}</div>
                        </td>
                        <td className="py-3 px-4" rowSpan={venda.produtos.length}>
                          <div className="text-sm text-gray-900">{formatPhone(venda.telefone)}</div>
                        </td>
                      </>
                    )}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="font-medium text-gray-900">{produto.produtoNome}</div>
                        {venda.fotoProduto && index === 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(venda.fotoProduto, '_blank')
                            }}
                            className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                            title="Ver foto do produto"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {venda.observacoes && index === 0 && (
                        <div className="text-xs text-gray-500 mt-1">{venda.observacoes}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {produto.quantidade}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{formatCurrency(produto.precoUnitario)}</div>
                      {venda.produtos.length > 1 && index === 0 && (
                        <div className="text-xs text-gray-500">Total: {formatCurrency(venda.valorTotal)}</div>
                      )}
                    </td>
                    {index === 0 && (
                      <td className="py-3 px-4" rowSpan={venda.produtos.length}>
                        <div className="font-medium text-gray-900">{venda.vendedorNome}</div>
                        <div className="text-xs text-gray-500">{venda.vendedorEmail}</div>
                      </td>
                    )}
                    {index === 0 && (
                      <td className="py-3 px-4" rowSpan={venda.produtos.length}>
                        <div className="text-sm text-gray-900">{formatDate(venda.createdAt)}</div>
                      </td>
                    )}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {vendasFiltradas.map((venda) => (
          <div 
            key={venda.vendaId} 
            className={`rounded-xl p-4 border shadow-sm cursor-pointer hover:shadow-md transition-shadow ${
              venda.formaPagamento === 'crediario'
                ? 'bg-red-50 border-red-200 hover:bg-red-100'
                : 'bg-white border-gray-200'
            }`}
            onClick={() => abrirDetalhes(venda.produtos[0].id)}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs font-mono text-gray-500 mb-1">ID: {venda.vendaId}</p>
                <h4 className="font-semibold text-gray-900">{venda.clienteNome}</h4>
                <p className="text-sm text-gray-600">{formatPhone(venda.telefone)}</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {formatCurrency(venda.valorTotal)}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Produtos ({venda.produtos.length}):</span>
                <div className="flex items-center space-x-2">
                  {venda.fotoProduto && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        window.open(venda.fotoProduto, '_blank')
                      }}
                      className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                      title="Ver foto do produto"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              
              {/* Lista de produtos */}
              <div className="space-y-1">
                {venda.produtos.map((produto) => (
                  <div key={produto.id} className="flex justify-between items-center bg-gray-50 rounded-lg p-2">
                    <div>
                      <span className="font-medium text-gray-900">{produto.produtoNome}</span>
                    </div>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {produto.quantidade}x
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Vendedor:</span>
                <span className="font-medium">{venda.vendedorNome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Data:</span>
                <span className="font-medium">{formatDate(venda.createdAt)}</span>
              </div>
              {venda.observacoes && (
                <div className="pt-2 border-t border-gray-100">
                  <span className="text-gray-600">Obs:</span>
                  <p className="text-gray-900 mt-1">{venda.observacoes}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {vendasFiltradas.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">Nenhuma venda encontrada</h4>
          <p className="text-gray-600">
            {filtroCliente || filtroDataInicio || filtroDataFim ? 'Tente ajustar os filtros de busca.' : 'Ainda não há vendas registradas.'}
          </p>
        </div>
      )}

      {/* Paginação */}
      {totalPaginas > 1 && (() => {
        // Calcular quais páginas mostrar (máximo 7 páginas visíveis)
        const getPaginasParaMostrar = () => {
          const maxPaginasVisiveis = 7
          const paginas: (number | string)[] = []
          
          if (totalPaginas <= maxPaginasVisiveis) {
            // Se há poucas páginas, mostrar todas
            for (let i = 1; i <= totalPaginas; i++) {
              paginas.push(i)
            }
          } else {
            // Sempre mostrar primeira página
            paginas.push(1)
            
            if (paginaAtual <= 4) {
              // Páginas iniciais: 1, 2, 3, 4, 5, ..., última
              for (let i = 2; i <= 5; i++) {
                paginas.push(i)
              }
              paginas.push('...')
              paginas.push(totalPaginas)
            } else if (paginaAtual >= totalPaginas - 3) {
              // Páginas finais: 1, ..., penúltimas, última
              paginas.push('...')
              for (let i = totalPaginas - 4; i <= totalPaginas; i++) {
                paginas.push(i)
              }
            } else {
              // Páginas do meio: 1, ..., anterior, atual, próxima, ..., última
              paginas.push('...')
              for (let i = paginaAtual - 1; i <= paginaAtual + 1; i++) {
                paginas.push(i)
              }
              paginas.push('...')
              paginas.push(totalPaginas)
            }
          }
          
          return paginas
        }
        
        const paginasParaMostrar = getPaginasParaMostrar()
        
        return (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-700">
              Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, totalVendas)} de {totalVendas} vendas
            </div>
            
            <div className="flex items-center space-x-2 flex-wrap justify-center">
              <button
                onClick={() => setPaginaAtual(paginaAtual - 1)}
                disabled={paginaAtual === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              
              <div className="flex space-x-1 flex-wrap justify-center">
                {paginasParaMostrar.map((pagina, index) => {
                  if (pagina === '...') {
                    return (
                      <span key={`ellipsis-${index}`} className="px-2 py-2 text-sm text-gray-500">
                        ...
                      </span>
                    )
                  }
                  
                  const numPagina = pagina as number
                  return (
                    <button
                      key={numPagina}
                      onClick={() => setPaginaAtual(numPagina)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        numPagina === paginaAtual
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {numPagina}
                    </button>
                  )
                })}
              </div>
              
              <button
                onClick={() => setPaginaAtual(paginaAtual + 1)}
                disabled={paginaAtual === totalPaginas}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Próxima
              </button>
            </div>
          </div>
        )
      })()}
        </>
      )}

      {/* Aba de Resumo por Vendedor */}
      {abaAtiva === 'resumo' && (
        <div className="space-y-6">
          {/* Resumo Geral */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total de Vendedores</p>
                  <p className="text-2xl font-bold text-gray-900">{resumoVendedores.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Valor Total Vendido</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(resumoVendedores.reduce((total, vendedor) => total + vendedor.totalValor, 0))}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total de Vendas</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {resumoVendedores.reduce((total, vendedor) => total + vendedor.totalVendas, 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Vendedores */}
          {resumoVendedores.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Nenhum vendedor encontrado</h4>
              <p className="text-gray-600">Não há vendas registradas no período selecionado.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {resumoVendedores.map((vendedor, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {vendedor.vendedorNome.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{vendedor.vendedorNome}</h4>
                        <p className="text-sm text-gray-600">{vendedor.vendedorEmail}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Total vendido</div>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(vendedor.totalValor)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {vendedor.totalVendas} vendas • {vendedor.quantidadeProdutos} produtos
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
