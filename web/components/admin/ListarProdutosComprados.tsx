'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import { formatDate, formatCurrency } from '@/lib/formatters'
import { ProdutoComprado } from '@/types/produto'
import { ListarProdutosCompradosProps } from '@/types/components'

export default function ListarProdutosComprados({ onAbrirPrecificacao, onEditarProduto, onDistribuirProduto }: ListarProdutosCompradosProps) {
  const [produtos, setProdutos] = useState<ProdutoComprado[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingSilencioso, setLoadingSilencioso] = useState(false)
  const [error, setError] = useState('')
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [totalPaginas, setTotalPaginas] = useState(1)
  const [totalProdutos, setTotalProdutos] = useState(0)
  const [filtroBusca, setFiltroBusca] = useState('')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  
  // Estados para os valores dos inputs (sem debounce)
  const [inputBusca, setInputBusca] = useState('')
  
  const itensPorPagina = 10
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Função para aplicar debounce no filtro de busca
  const aplicarDebounce = useCallback((novaBusca: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      setFiltroBusca(novaBusca)
      setPaginaAtual(1) // Reset para primeira página quando filtrar
    }, 500) // 500ms de delay
  }, [])

  // Função para lidar com mudanças no input de busca
  const handleInputBuscaChange = (valor: string) => {
    setInputBusca(valor)
    aplicarDebounce(valor)
  }

  const carregarProdutos = useCallback(async (silencioso = false) => {
    try {
      if (silencioso) {
        setLoadingSilencioso(true)
      } else {
        setLoading(true)
      }

      const { productApi } = await import('@/lib/api')
      const response = await productApi.listar({
        pagina: paginaAtual,
        limite: itensPorPagina,
        busca: filtroBusca || undefined,
        dataInicio: filtroDataInicio || undefined,
        dataFim: filtroDataFim || undefined,
      })

      if (response.success && response.data) {
        // Garantir que os valores numéricos sejam convertidos corretamente
        const produtosFormatados = response.data.map((produto: any) => ({
          ...produto,
          custoDolar: typeof produto.custoDolar === 'string' ? parseFloat(produto.custoDolar) : (produto.custoDolar || 0),
          taxaDolar: typeof produto.taxaDolar === 'string' ? parseFloat(produto.taxaDolar) : (produto.taxaDolar || 0),
          preco: typeof produto.preco === 'string' ? parseFloat(produto.preco) : (produto.preco || 0),
        }))
        setProdutos(produtosFormatados)
        setTotalPaginas(response.paginacao?.totalPaginas || 1)
        setTotalProdutos(response.paginacao?.total || 0)
        setError('') // Limpar erro se sucesso
      } else {
        setError(response.message || 'Erro ao carregar produtos')
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
      setError('Erro de conexão. Tente novamente.')
    } finally {
      if (silencioso) {
        setLoadingSilencioso(false)
      } else {
        setLoading(false)
      }
    }
  }, [paginaAtual, filtroBusca, filtroDataInicio, filtroDataFim])

  const [primeiraCarga, setPrimeiraCarga] = useState(true)

  useEffect(() => {
    if (primeiraCarga) {
      carregarProdutos(false) // Carregamento normal na primeira vez
      setPrimeiraCarga(false)
    } else {
      carregarProdutos(true) // Carregamento silencioso nas demais vezes
    }
  }, [carregarProdutos, primeiraCarga])

  // Cleanup do timeout quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  const limparFiltros = () => {
    // Limpar timeout se existir
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    
    setFiltroBusca('')
    setInputBusca('')
    setFiltroDataInicio('')
    setFiltroDataFim('')
    setPaginaAtual(1)
  }

  const exportarParaExcel = async () => {
    try {
      setLoadingSilencioso(true)
      
      // Buscar todos os produtos (sem paginação)
      const params = new URLSearchParams({
        limite: '999999', // Buscar todos
        ordenacao: 'data'
      })
      
      const { productApi } = await import('@/lib/api')
      const response = await productApi.listar({
        pagina: paginaAtual,
        limite: itensPorPagina,
        busca: filtroBusca || undefined,
        dataInicio: filtroDataInicio || undefined,
        dataFim: filtroDataFim || undefined,
      })
      
      if (!response.success) {
        throw new Error(response.message || 'Erro ao buscar produtos')
      }

      // Função para formatar números com vírgula (formato brasileiro) - apenas número, sem R$
      const formatarNumero = (valor: number | null | undefined): string => {
        if (valor === null || valor === undefined) return ''
        // Converter para string e substituir ponto por vírgula (formato brasileiro)
        return valor.toString().replace('.', ',')
      }

      // Preparar dados para Excel - uma linha por produto comprado
      const dadosExcel = (response.data as ProdutoComprado[]).map((produto: ProdutoComprado) => ({
        'ID': produto.id,
        'Nome': produto.nome,
        'Descrição': produto.descricao || '',
        'Cor': produto.cor || '',
        'IMEI': produto.imei || '',
        'Código de Barras': produto.codigoBarras || '',
        'Custo Dólar': formatarNumero(produto.custoDolar),
        'Taxa Dólar': formatarNumero(produto.taxaDolar),
        'Preço': formatarNumero(produto.preco),
        'Quantidade': produto.quantidade,
        'Quantidade Backup': produto.quantidadeBackup || produto.quantidade,
        'Data Compra': new Date(produto.dataCompra).toLocaleDateString('pt-BR'),
        'Valor Atacado': produto.valorAtacado ? formatarNumero(produto.valorAtacado) : '',
        'Valor Varejo': produto.valorVarejo ? formatarNumero(produto.valorVarejo) : '',
        'Valor Parcelado 10x': produto.valorParcelado10x ? formatarNumero(produto.valorParcelado10x) : ''
      }))

      // Criar arquivo Excel (XLSX) com ajuste automático de colunas
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(dadosExcel)
      
      // Obter headers das chaves dos dados
      const headers = Object.keys(dadosExcel[0] || {})
      
      // Ajustar largura das colunas automaticamente
      const colWidths = headers.map((header: string) => {
        const maxLength = Math.max(
          header.length,
          ...dadosExcel.map((row: Record<string, string | number>) => {
            const value = row[header]
            return value ? String(value).length : 0
          })
        )
        return { wch: Math.min(Math.max(maxLength + 2, 10), 50) } // Mínimo 10, máximo 50
      })
      
      worksheet['!cols'] = colWidths
      
      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos Comprados')
      
      // Gerar arquivo Excel
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      
      // Download do arquivo
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `produtos_comprados_${new Date().toISOString().split('T')[0]}.xlsx`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

    } catch (error) {
      console.error('Erro ao exportar:', error)
      alert('Erro ao exportar dados. Tente novamente.')
    } finally {
      setLoadingSilencioso(false)
    }
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando produtos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center">
        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        {error}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">📦 Produtos Comprados</h3>
            <p className="text-gray-600">Histórico de todas as compras realizadas</p>
          </div>
          <button
            onClick={exportarParaExcel}
            disabled={loadingSilencioso}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loadingSilencioso ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            <span>{loadingSilencioso ? 'Exportando...' : 'Exportar Excel'}</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar por nome, IMEI ou código de barras
            </label>
            <input
              type="text"
              value={inputBusca}
              onChange={(e) => handleInputBuscaChange(e.target.value)}
              placeholder="Digite o nome, IMEI ou código de barras..."
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

      {/* Indicador de carregamento silencioso */}
      {loadingSilencioso && (
        <div className="mb-4 flex items-center justify-center">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
            <span>Atualizando resultados...</span>
          </div>
        </div>
      )}

      {produtos.length === 0 && !loadingSilencioso ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum produto comprado</h3>
          <p className="text-gray-500">Cadastre sua primeira compra para começar!</p>
        </div>
      ) : (produtos.length > 0 || loadingSilencioso) ? (
        <div className="space-y-4">
          {produtos.map((produto) => (
            <div key={produto.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{produto.nome}</h4>
                </div>
                <div className="mt-2 sm:mt-0 text-right">
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(produto.preco)}</p>
                  <p className="text-sm text-gray-500">Preço de custo</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Custo</p>
                  <p className="text-sm font-semibold text-gray-900">
                    $ {typeof produto.custoDolar === 'number' ? produto.custoDolar.toFixed(2) : (Number(produto.custoDolar) || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Taxa</p>
                  <p className="text-sm font-semibold text-gray-900">
                    R$ {typeof produto.taxaDolar === 'number' ? produto.taxaDolar.toFixed(4) : (Number(produto.taxaDolar) || 0).toFixed(4)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quantidade</p>
                  <p className="text-sm font-semibold text-gray-900">{produto.quantidade} unidades</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Data</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {produto.dataCompra ? formatDate(produto.dataCompra) : 'N/A'}
                  </p>
                </div>
              </div>

              {(produto.cor || produto.imei || produto.codigoBarras || produto.descricao) && (
                <div className="flex flex-wrap gap-4 mb-4">
                  {produto.cor && (
                    <div className="flex items-center">
                      <span className="text-xs font-medium text-gray-500 mr-2">Cor:</span>
                      <span className="text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded">{produto.cor}</span>
                    </div>
                  )}
                  {produto.imei && (
                    <div className="flex items-center">
                      <span className="text-xs font-medium text-gray-500 mr-2">IMEI:</span>
                      <span className="text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded font-mono">{produto.imei}</span>
                    </div>
                  )}
                  {produto.codigoBarras && (
                    <div className="flex items-center">
                      <span className="text-xs font-medium text-gray-500 mr-2">Código de Barras:</span>
                      <span className="text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded font-mono">{produto.codigoBarras}</span>
                    </div>
                  )}
                  {produto.descricao && (
                    <div className="flex items-center">
                      <span className="text-xs font-medium text-gray-500 mr-2">Descrição:</span>
                      <span className="text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded">{produto.descricao}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-gray-200 pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center">
                    <div className="text-sm">
                      <span className="text-gray-500">Estoque disponível:</span>
                      <span className="ml-2 font-semibold text-gray-900">
                        {produto.quantidade} unidades
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => onEditarProduto(produto)}
                      className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-200 transition-colors flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </button>
                    <button
                      onClick={() => onAbrirPrecificacao(produto)}
                      className="px-3 py-1.5 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-200 transition-colors"
                    >
                      💰 Precificação
                    </button>
                    <button
                      onClick={() => onDistribuirProduto(produto)}
                      className="px-3 py-1.5 bg-green-100 text-green-700 text-sm font-medium rounded-lg hover:bg-green-200 transition-colors flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                      Distribuir
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Paginação */}
      {totalPaginas > 1 && !loadingSilencioso && (
        <div className="mt-8 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, totalProdutos)} de {totalProdutos} produtos
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
  )
}

