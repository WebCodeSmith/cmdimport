'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { useToastContext } from '@/contexts/ToastContext'
import * as XLSX from 'xlsx'
import { formatCurrency } from '@/lib/formatters'
import { EstoqueUsuario, ProdutoEstoqueCompleto } from '@/types/estoque'
import { UsuarioEstoque } from '@/types/user'
import ModalDeletarEstoque from './ModalDeletarEstoque'

export default function EstoqueUsuarios() {
  const { showToast } = useToastContext()
  const [estoqueUsuarios, setEstoqueUsuarios] = useState<EstoqueUsuario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtroUsuario, setFiltroUsuario] = useState('')
  const [filtroImeiCodigo, setFiltroImeiCodigo] = useState('')
  const [mostrarEstoquesZerados, setMostrarEstoquesZerados] = useState(false)
  const [produtoExpandido, setProdutoExpandido] = useState<number | null>(null)
  const [modalRedistribuicao, setModalRedistribuicao] = useState(false)
  const [produtoRedistribuir, setProdutoRedistribuir] = useState<ProdutoEstoqueCompleto | null>(null)
  const [usuarioOrigem, setUsuarioOrigem] = useState<UsuarioEstoque | null>(null)
  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState<UsuarioEstoque[]>([])
  const [formularioRedistribuicao, setFormularioRedistribuicao] = useState({
    usuarioDestinoId: '',
    quantidade: ''
  })
  const [salvandoRedistribuicao, setSalvandoRedistribuicao] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [modalDeletar, setModalDeletar] = useState(false)
  const [estoqueParaDeletar, setEstoqueParaDeletar] = useState<{
    id: number
    produtoNome: string
    usuarioNome: string
  } | null>(null)
  const [deletando, setDeletando] = useState(false)

  const carregarEstoqueUsuarios = useCallback(async () => {
    try {
      setLoading(true)
      const { stockApi } = await import('@/lib/api')
      const response = await stockApi.listarEstoqueUsuarios()

      if (response.success && response.data) {
        setEstoqueUsuarios(response.data)
      } else {
        setError(response.message || 'Erro ao carregar estoque dos usuários')
      }
    } catch (error) {
      console.error('Erro ao carregar estoque dos usuários:', error)
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarEstoqueUsuarios()
  }, [carregarEstoqueUsuarios])


  const exportarParaExcel = async () => {
    try {
      setExportando(true)

      // Função para formatar números com vírgula (formato brasileiro) - apenas número, sem R$
      const formatarNumero = (valor: number | null | undefined): string | number => {
        if (valor === null || valor === undefined) return ''
        // Retornar número puro para o Excel (sem formatação de moeda)
        return valor
      }

      // Preparar dados para Excel - uma linha por produto de cada usuário
      const linhasExcel: Array<Record<string, string | number>> = []

      usuariosFiltrados.forEach((usuario) => {
        usuario.produtos.forEach((produto) => {
          // Determinar status
          let status = ''
          if (produto.quantidade === 0) {
            status = 'Zerado'
          } else if (produto.quantidade <= 2) {
            status = 'Crítico'
          } else {
            status = 'Em estoque'
          }

          linhasExcel.push({
            'ID Produto': produto.produtoCompradoId,
            'Vendedor': usuario.nome,
            'Produto': produto.nome,
            'Quantidade': produto.quantidade,
            'Status': status,
            'Preço': formatarNumero(produto.preco),

            'Cor': produto.cor || '',
            'IMEI': produto.imei || '',
            'Código de Barras': produto.codigoBarras || '',
            'Descrição': produto.descricao || ''
          })
        })
      })

      // Criar arquivo Excel (XLSX) com ajuste automático de colunas
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(linhasExcel.length > 0 ? linhasExcel : [{}])

      // Obter headers das chaves dos dados
      const headers = linhasExcel.length > 0 ? Object.keys(linhasExcel[0]) : []

      // Ajustar largura das colunas automaticamente
      const colWidths = headers.map((header: string) => {
        const maxLength = Math.max(
          header.length,
          ...linhasExcel.map((row: Record<string, string | number>) => {
            const value = row[header]
            return value ? String(value).length : 0
          })
        )
        return { wch: Math.min(Math.max(maxLength + 2, 10), 50) } // Mínimo 10, máximo 50
      })

      worksheet['!cols'] = colWidths

      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Estoque Usuários')

      // Gerar arquivo Excel
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })

      // Download do arquivo
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `estoque_usuarios_${new Date().toISOString().split('T')[0]}.xlsx`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

    } catch (error) {
      console.error('Erro ao exportar:', error)
      showToast('Erro ao exportar dados. Tente novamente.', 'error')
    } finally {
      setExportando(false)
    }
  }

  const toggleDescricao = (produtoId: number) => {
    setProdutoExpandido(produtoExpandido === produtoId ? null : produtoId)
  }

  const abrirModalRedistribuicao = async (produto: ProdutoEstoqueCompleto, usuario: UsuarioEstoque) => {
    // Verificar se há quantidade disponível
    if (produto.quantidade <= 0) {
      showToast('Não é possível redistribuir produto sem estoque', 'error')
      return
    }

    setProdutoRedistribuir(produto)
    setUsuarioOrigem(usuario)

    // Carregar lista de usuários disponíveis (excluindo o usuário origem)
    try {
      const { authApi } = await import('@/lib/api')
      const response = await authApi.listarUsuarios()

      if (response.success && response.data) {
        // Filtrar usuários, excluindo o usuário origem
        const usuariosFiltrados = (response.data as any[]).filter((u: UsuarioEstoque) => u.id !== usuario.id)
        setUsuariosDisponiveis(usuariosFiltrados)
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
    }

    setFormularioRedistribuicao({
      usuarioDestinoId: '',
      quantidade: ''
    })
    setModalRedistribuicao(true)
  }

  const fecharModalRedistribuicao = () => {
    setModalRedistribuicao(false)
    setProdutoRedistribuir(null)
    setUsuarioOrigem(null)
    setUsuariosDisponiveis([])
    setFormularioRedistribuicao({
      usuarioDestinoId: '',
      quantidade: ''
    })
  }

  const salvarRedistribuicao = async () => {
    if (!produtoRedistribuir || !usuarioOrigem || !formularioRedistribuicao.usuarioDestinoId || !formularioRedistribuicao.quantidade) {
      return
    }

    try {
      setSalvandoRedistribuicao(true)
      const { productApi } = await import('@/lib/api')
      const response = await productApi.redistribuir({
        produtoId: produtoRedistribuir.id,
        usuarioOrigemId: usuarioOrigem.id,
        usuarioDestinoId: parseInt(formularioRedistribuicao.usuarioDestinoId),
        quantidade: parseInt(formularioRedistribuicao.quantidade)
      })

      if (response.success) {
        // Recarregar dados
        carregarEstoqueUsuarios()
        fecharModalRedistribuicao()
        showToast(`Produto redistribuído com sucesso! ${produtoRedistribuir.nome} - Quantidade: ${formularioRedistribuicao.quantidade}`, 'success')
      } else {
        showToast('Erro ao redistribuir produto: ' + response.message, 'error')
      }
    } catch (error) {
      console.error('Erro ao redistribuir produto:', error)
      showToast('Erro de conexão. Tente novamente.', 'error')
    } finally {
      setSalvandoRedistribuicao(false)
    }
  }

  const abrirModalDeletar = (estoqueId: number, produtoNome: string, usuarioNome: string) => {
    setEstoqueParaDeletar({
      id: estoqueId,
      produtoNome,
      usuarioNome
    })
    setModalDeletar(true)
  }

  const fecharModalDeletar = () => {
    setModalDeletar(false)
    setEstoqueParaDeletar(null)
  }

  const confirmarDeletarEstoque = async () => {
    if (!estoqueParaDeletar) return

    try {
      setDeletando(true)
      const { stockApi } = await import('@/lib/api')
      const response = await stockApi.deletarEstoque(estoqueParaDeletar.id)

      if (response.success) {
        showToast(`Estoque deletado com sucesso! ${estoqueParaDeletar.produtoNome} - ${estoqueParaDeletar.usuarioNome}`, 'success')

        // Atualizar estado local sem recarregar a página - apenas remover o item
        setEstoqueUsuarios(prev => {
          return prev.map(usuario => {
            const produtosAtualizados = usuario.produtos.filter(produto => produto.id !== estoqueParaDeletar.id)

            // Se o usuário não tem mais produtos após deletar, manter o usuário mas com lista vazia
            return {
              ...usuario,
              produtos: produtosAtualizados,
              totalProdutos: produtosAtualizados.length,
              totalQuantidade: produtosAtualizados.reduce((total, produto) => total + produto.quantidade, 0)
            }
          })
        })

        fecharModalDeletar()
      } else {
        showToast('Erro ao deletar estoque: ' + response.message, 'error')
      }
    } catch (error) {
      console.error('Erro ao deletar estoque:', error)
      showToast('Erro de conexão. Tente novamente.', 'error')
    } finally {
      setDeletando(false)
    }
  }

  const usuariosFiltrados = estoqueUsuarios.map(usuario => {
    // Filtro por nome/email
    const passaFiltroTexto = usuario.nome.toLowerCase().includes(filtroUsuario.toLowerCase()) ||
      usuario.email.toLowerCase().includes(filtroUsuario.toLowerCase())

    if (!passaFiltroTexto) {
      return null
    }

    // Filtrar produtos baseado na opção de mostrar estoques zerados e busca por IMEI/código
    let produtosFiltrados = mostrarEstoquesZerados
      ? usuario.produtos
      : usuario.produtos.filter(produto => produto.quantidade > 0)

    // Aplicar filtro por IMEI/código de barras se especificado
    if (filtroImeiCodigo) {
      produtosFiltrados = produtosFiltrados.filter(produto => {
        const correspondeImei = produto.imei ? produto.imei.includes(filtroImeiCodigo) : false
        const correspondeCodigoBarras = produto.codigoBarras ? produto.codigoBarras.includes(filtroImeiCodigo) : false
        return correspondeImei || correspondeCodigoBarras
      })
    }

    // Se não há produtos após o filtro, não mostrar o usuário
    if (produtosFiltrados.length === 0 && !mostrarEstoquesZerados) {
      return null
    }

    return {
      ...usuario,
      produtos: produtosFiltrados,
      totalProdutos: produtosFiltrados.length,
      totalQuantidade: produtosFiltrados.reduce((total, produto) => total + produto.quantidade, 0)
    }
  }).filter(usuario => usuario !== null)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando estoque dos usuários...</p>
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
            <h3 className="text-xl font-bold text-gray-900 mb-2">📊 Estoque dos Usuários</h3>
            <p className="text-gray-600">Visualize o estoque de cada vendedor</p>
          </div>
          <button
            onClick={exportarParaExcel}
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
        </div>
      </div>

      {/* Filtro */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar por usuário
            </label>
            <input
              type="text"
              value={filtroUsuario}
              onChange={(e) => setFiltroUsuario(e.target.value)}
              placeholder="Digite o nome ou email do usuário..."
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

          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={mostrarEstoquesZerados}
                onChange={(e) => setMostrarEstoquesZerados(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Mostrar estoques zerados
              </span>
            </label>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFiltroUsuario('')
                setFiltroImeiCodigo('')
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Limpar
            </button>
          </div>
        </div>
      </div>

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
              <p className="text-sm font-medium text-gray-600">Total de Usuários</p>
              <p className="text-2xl font-bold text-gray-900">{estoqueUsuarios.length}</p>
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
              <p className="text-sm font-medium text-gray-600">Valor Total do Estoque</p>
              <p className="text-2xl font-bold text-gray-900">
                R$ {estoqueUsuarios.reduce((total, usuario) => {
                  return total + usuario.produtos.reduce((produtoTotal, produto) => {
                    return produtoTotal + (produto.quantidade * produto.preco)
                  }, 0)
                }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              <p className="text-sm font-medium text-gray-600">Total de Unidades</p>
              <p className="text-2xl font-bold text-gray-900">
                {estoqueUsuarios.reduce((total, usuario) => total + usuario.totalQuantidade, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Usuários */}
      {usuariosFiltrados.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum usuário encontrado</h3>
          <p className="text-gray-500">Tente ajustar os filtros de busca</p>
        </div>
      ) : (
        <div className="space-y-6">
          {usuariosFiltrados.map((usuario) => (
            <div key={usuario.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              {/* Header do Usuário */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {usuario.nome.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{usuario.nome}</h4>
                    <p className="text-sm text-gray-600">{usuario.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Total de produtos</div>
                  <div className="text-2xl font-bold text-indigo-600">{usuario.totalProdutos}</div>
                  <div className="text-sm text-gray-500">{usuario.totalQuantidade} unidades</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Valor: <span className="font-semibold text-green-600">
                      R$ {usuario.produtos.reduce((total, produto) => {
                        return total + (produto.quantidade * produto.preco)
                      }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Produtos do Usuário */}
              {usuario.produtos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p>Nenhum produto em estoque</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 font-medium text-gray-700">Produto</th>
                        <th className="text-center py-3 px-2 font-medium text-gray-700">Qtd</th>
                        <th className="text-center py-3 px-2 font-medium text-gray-700">Status</th>
                        <th className="text-right py-3 px-2 font-medium text-gray-700">Preço</th>

                        <th className="text-center py-3 px-2 font-medium text-gray-700">Cor</th>
                        <th className="text-center py-3 px-2 font-medium text-gray-700">IMEI</th>
                        <th className="text-center py-3 px-2 font-medium text-gray-700">Código de Barras</th>
                        <th className="text-center py-3 px-2 font-medium text-gray-700">Descrição</th>
                        <th className="text-center py-3 px-2 font-medium text-gray-700">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuario.produtos.map((produto) => (
                        <Fragment key={produto.id}>
                          <tr className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-2">
                              <div className="font-semibold text-gray-800 text-base">{produto.nome}</div>
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className="font-bold text-gray-900 text-lg">{produto.quantidade}</span>
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${produto.quantidade === 0
                                  ? 'bg-red-100 text-red-800'
                                  : produto.quantidade <= 2
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                {produto.quantidade === 0 ? 'Zerado' : produto.quantidade <= 2 ? 'Crítico' : 'Em estoque'}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <span className="font-bold text-gray-900 text-lg">{formatCurrency(produto.preco)}</span>
                            </td>

                            <td className="py-3 px-2 text-center">
                              <span className="font-semibold text-gray-800 text-base">{produto.cor || '-'}</span>
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className="font-semibold text-gray-800 font-mono text-sm">{produto.imei || '-'}</span>
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className="font-semibold text-gray-800 font-mono text-sm">
                                {produto.codigoBarras ? produto.codigoBarras : '-'}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-center">
                              {produto.descricao ? (
                                <button
                                  onClick={() => toggleDescricao(produto.id)}
                                  className="p-1 text-indigo-600 hover:text-indigo-800 transition-colors"
                                  title="Ver descrição"
                                >
                                  <svg className={`w-4 h-4 transition-transform duration-200 ${produtoExpandido === produto.id ? 'rotate-180' : ''
                                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {produto.quantidade > 0 ? (
                                  <>
                                    <button
                                      onClick={() => abrirModalRedistribuicao(produto, usuario)}
                                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                                      title="Redistribuir produto"
                                    >
                                      🔄 Redistribuir
                                    </button>
                                    <button
                                      onClick={() => abrirModalDeletar(produto.id, produto.nome, usuario.nome)}
                                      className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                                      title="Deletar estoque"
                                    >
                                      🗑️ Deletar
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed">
                                      ❌ Sem estoque
                                    </span>
                                    <button
                                      onClick={() => abrirModalDeletar(produto.id, produto.nome, usuario.nome)}
                                      className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                                      title="Deletar estoque"
                                    >
                                      🗑️ Deletar
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                          {/* Linha expandida com descrição */}
                          {produtoExpandido === produto.id && produto.descricao && (
                            <tr className="bg-gray-50">
                              <td colSpan={11} className="py-4 px-6">
                                <div className="bg-white border border-gray-200 rounded-lg p-4">
                                  <div className="flex items-start space-x-3">
                                    <div className="flex-shrink-0">
                                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      </div>
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Descrição do Produto</h4>
                                      <p className="text-gray-700 text-sm leading-relaxed">{produto.descricao}</p>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Confirmação de Deleção */}
      <ModalDeletarEstoque
        isOpen={modalDeletar}
        produtoNome={estoqueParaDeletar?.produtoNome || ''}
        usuarioNome={estoqueParaDeletar?.usuarioNome || ''}
        deletando={deletando}
        onConfirmar={confirmarDeletarEstoque}
        onCancelar={fecharModalDeletar}
      />

      {/* Modal de Redistribuição */}
      {modalRedistribuicao && produtoRedistribuir && usuarioOrigem && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Redistribuir Produto</h3>
                <p className="text-sm text-gray-600">Transferir produto entre vendedores</p>
              </div>
              <button
                onClick={fecharModalRedistribuicao}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6 space-y-6">
              {/* Informações do Produto */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">{produtoRedistribuir.nome}</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-700 font-medium">De:</span>
                    <span className="ml-2 font-semibold text-gray-900">{usuarioOrigem.nome}</span>
                  </div>
                  <div>
                    <span className="text-gray-700 font-medium">Quantidade disponível:</span>
                    <span className="ml-2 font-semibold text-gray-900">{produtoRedistribuir.quantidade}</span>
                  </div>
                </div>
              </div>

              {/* Formulário */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Para qual vendedor? *
                  </label>
                  <select
                    value={formularioRedistribuicao.usuarioDestinoId}
                    onChange={(e) => setFormularioRedistribuicao({ ...formularioRedistribuicao, usuarioDestinoId: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                    required
                  >
                    <option value="">Selecione um vendedor</option>
                    {usuariosDisponiveis.map((usuario) => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.nome} {usuario.isAdmin ? '(Admin)' : ''} ({usuario.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Quantidade a transferir *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={produtoRedistribuir.quantidade}
                    value={formularioRedistribuicao.quantidade}
                    onChange={(e) => setFormularioRedistribuicao({ ...formularioRedistribuicao, quantidade: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                    placeholder="Quantidade"
                    required
                  />
                  <p className="text-xs text-gray-600 mt-1 font-medium">
                    Máximo: {produtoRedistribuir.quantidade} unidades
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={fecharModalRedistribuicao}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                disabled={salvandoRedistribuicao}
              >
                Cancelar
              </button>
              <button
                onClick={salvarRedistribuicao}
                disabled={salvandoRedistribuicao || !formularioRedistribuicao.usuarioDestinoId || !formularioRedistribuicao.quantidade}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {salvandoRedistribuicao ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Redistribuindo...
                  </div>
                ) : (
                  '🔄 Redistribuir'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
