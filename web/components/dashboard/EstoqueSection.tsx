'use client'

import React, { useState, useEffect } from 'react'
import { EstoqueItemExtended, ProdutoEstoque } from '@/types/estoque'
import { UsuarioEstoque } from '@/types/user'
import { useToastContext } from '@/contexts/ToastContext'
import { formatCurrency } from '@/lib/formatters'
import { EstoqueSectionProps } from '@/types/components'

export default function EstoqueSection({ usuarioId }: EstoqueSectionProps) {
  const { showToast } = useToastContext()
  const [estoque, setEstoque] = useState<EstoqueItemExtended[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarEstoquesZerados, setMostrarEstoquesZerados] = useState(false)
  const [produtoExpandido, setProdutoExpandido] = useState<number | null>(null)
  const [modalRedistribuicao, setModalRedistribuicao] = useState(false)
  const [produtoRedistribuir, setProdutoRedistribuir] = useState<ProdutoEstoque | null>(null)
  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState<UsuarioEstoque[]>([])
  const [formularioRedistribuicao, setFormularioRedistribuicao] = useState({
    usuarioDestinoId: '',
    quantidade: ''
  })
  const [salvandoRedistribuicao, setSalvandoRedistribuicao] = useState(false)

  useEffect(() => {
    const carregarEstoque = async () => {
      try {
        const { stockApi } = await import('@/lib/api')
        const response = await stockApi.listar(usuarioId)
        
        if (response.success && response.data) {
          setEstoque(response.data)
        } else {
          console.error('Erro ao carregar estoque:', response.message)
        }
      } catch (error) {
        console.error('Erro ao carregar estoque:', error)
      } finally {
        setLoading(false)
      }
    }

    carregarEstoque()
  }, [usuarioId])

  const toggleDescricao = (produtoId: number) => {
    setProdutoExpandido(produtoExpandido === produtoId ? null : produtoId)
  }

  const abrirModalRedistribuicao = async (produto: ProdutoEstoque) => {
    // Verificar se há quantidade disponível
    if (produto.quantidade <= 0) {
      showToast('Não é possível redistribuir produto sem estoque', 'error')
      return
    }

    setProdutoRedistribuir(produto)
    
    // Carregar lista de usuários disponíveis (excluindo o usuário atual)
    try {
      const { authApi } = await import('@/lib/api')
      const response = await authApi.listarUsuarios()
      
      if (response.success && response.data) {
        // Filtrar usuários, excluindo o usuário atual
        const usuariosFiltrados = response.data.filter((u: UsuarioEstoque) => u.id !== usuarioId)
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
    setUsuariosDisponiveis([])
    setFormularioRedistribuicao({
      usuarioDestinoId: '',
      quantidade: ''
    })
  }

  const salvarRedistribuicao = async () => {
    if (!produtoRedistribuir || !formularioRedistribuicao.usuarioDestinoId || !formularioRedistribuicao.quantidade) {
      return
    }

    try {
      setSalvandoRedistribuicao(true)
      const { productApi, stockApi } = await import('@/lib/api')
      const response = await productApi.redistribuir({
        produtoId: produtoRedistribuir.id,
        usuarioOrigemId: usuarioId,
        usuarioDestinoId: parseInt(formularioRedistribuicao.usuarioDestinoId),
        quantidade: parseInt(formularioRedistribuicao.quantidade)
      })

      if (response.success) {
        // Recarregar estoque
        const estoqueResponse = await stockApi.listar(usuarioId)
        if (estoqueResponse.success && estoqueResponse.data) {
          setEstoque(estoqueResponse.data)
        }
        
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


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando estoque...</p>
        </div>
      </div>
    )
  }

  // Filtrar estoque baseado na opção de mostrar estoques zerados
  const estoqueFiltrado = estoque.filter(item => {
    return mostrarEstoquesZerados || item.quantidade > 0
  })

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">📦 Estoque Disponível</h3>
        <p className="text-gray-600">Seus produtos em estoque</p>
      </div>

      {/* Filtro */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
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
          <div className="text-sm text-gray-500">
            {estoque.filter(item => item.quantidade > 0).length} produtos com estoque
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 max-w-md">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total de Unidades</p>
              <p className="text-2xl font-bold text-gray-900">
                {estoque.reduce((total, item) => total + item.quantidade, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Produtos */}
      {estoqueFiltrado.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            {mostrarEstoquesZerados ? 'Nenhum produto encontrado' : 'Nenhum produto em estoque'}
          </h4>
          <p className="text-gray-600">
            {mostrarEstoquesZerados 
              ? 'Tente ajustar os filtros de busca' 
              : 'Entre em contato com o administrador para adicionar produtos.'
            }
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-6 font-medium text-gray-700">Produto</th>
                  <th className="text-center py-4 px-4 font-medium text-gray-700">Qtd</th>
                  <th className="text-center py-4 px-4 font-medium text-gray-700">Status</th>
                  <th className="text-right py-4 px-4 font-medium text-gray-700">Preço</th>
                  <th className="text-center py-4 px-4 font-medium text-gray-700">Cor</th>
                  <th className="text-center py-4 px-4 font-medium text-gray-700">IMEI</th>
                  <th className="text-center py-4 px-4 font-medium text-gray-700">Código de Barras</th>
                  <th className="text-center py-4 px-4 font-medium text-gray-700">Descrição</th>
                  <th className="text-center py-4 px-4 font-medium text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {estoqueFiltrado.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-gray-900 text-base">{item.nome}</div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="font-bold text-gray-900 text-base">{item.quantidade}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          item.quantidade === 0 
                            ? 'bg-red-100 text-red-800' 
                            : item.quantidade <= 2 
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {item.quantidade === 0 ? 'Zerado' : item.quantidade <= 2 ? 'Crítico' : 'Em estoque'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="font-bold text-gray-900 text-base">{formatCurrency(item.preco)}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="font-bold text-gray-900 text-base">{item.cor || '-'}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="font-bold text-gray-900 font-mono text-base">{item.imei || '-'}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="font-bold text-gray-900 font-mono text-base">{item.codigoBarras || '-'}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        {item.descricao ? (
                          <button
                            onClick={() => toggleDescricao(item.id)}
                            className="p-1 text-indigo-600 hover:text-indigo-800 transition-colors"
                            title="Ver descrição"
                          >
                            <svg className={`w-4 h-4 transition-transform duration-200 ${
                              produtoExpandido === item.id ? 'rotate-180' : ''
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {item.quantidade > 0 ? (
                          <button
                            onClick={() => abrirModalRedistribuicao(item)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                            title="Redistribuir produto"
                          >
                            🔄 Redistribuir
                          </button>
                        ) : (
                          <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed">
                            ❌ Sem estoque
                          </span>
                        )}
                      </td>
                    </tr>
                    {/* Linha expandida com descrição */}
                    {produtoExpandido === item.id && item.descricao && (
                      <tr className="bg-gray-50">
                        <td colSpan={9} className="py-4 px-6">
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
                                <p className="text-gray-700 text-sm leading-relaxed">{item.descricao}</p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Redistribuição */}
      {modalRedistribuicao && produtoRedistribuir && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Redistribuir Produto</h3>
                <p className="text-sm text-gray-600">Transferir produto para outro vendedor</p>
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
                <div className="text-sm">
                  <span className="text-gray-700 font-medium">Quantidade disponível:</span>
                  <span className="ml-2 font-semibold text-gray-900">{produtoRedistribuir.quantidade}</span>
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
                    onChange={(e) => setFormularioRedistribuicao({...formularioRedistribuicao, usuarioDestinoId: e.target.value})}
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
                    onChange={(e) => setFormularioRedistribuicao({...formularioRedistribuicao, quantidade: e.target.value})}
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
