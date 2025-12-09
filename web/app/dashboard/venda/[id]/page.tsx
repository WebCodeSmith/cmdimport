'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { HistoricoVenda } from '@/types/venda'
import { formatDate, formatPhone } from '@/lib/formatters'

export default function DetalhesVendaVendedorPage() {
  const { user } = useAuth()
  const params = useParams()
  const router = useRouter()
  const [venda, setVenda] = useState<HistoricoVenda | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }

    const carregarVenda = async () => {
      try {
        const response = await fetch(`/api/vendas/venda/${params.id}`)
        const data = await response.json()
        
        if (data.success) {
          setVenda(data.data)
        } else {
          console.error('Erro ao carregar venda:', data.message)
          router.push('/dashboard/historico')
        }
      } catch (error) {
        console.error('Erro ao carregar venda:', error)
        router.push('/dashboard/historico')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      carregarVenda()
    }
  }, [params.id, router, user])


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
            onClick={() => router.push('/dashboard/historico')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Voltar ao Histórico
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
                onClick={() => router.push('/dashboard/historico')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900">📋 Detalhes da Venda</h1>
            </div>
            <button
              onClick={() => router.push('/dashboard/historico')}
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
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {produto.quantidade}x
                    </span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Valor Total da Venda</label>
                <p className="text-3xl font-bold text-green-600">R$ {venda.valorTotal.toFixed(2)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Total de Produtos</label>
                <p className="text-gray-900 font-medium">{venda.produtos.reduce((acc, p) => acc + p.quantidade, 0)} unidades</p>
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
    </div>
  )
}
