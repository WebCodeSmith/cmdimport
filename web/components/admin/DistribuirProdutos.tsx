'use client'

import { useState, useEffect } from 'react'
import type { ProdutoCompradoSimples } from '@/types/produto'
import { User } from '@/types/user'

export default function DistribuirProdutos() {
  const [produtos, setProdutos] = useState<ProdutoCompradoSimples[]>([])
  const [usuarios, setUsuarios] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [distribuindo, setDistribuindo] = useState(false)
  const [formData, setFormData] = useState({
    produtoId: '',
    usuarioId: '',
    quantidade: ''
  })

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      setLoading(true)
      const { productApi, authApi } = await import('@/lib/api')
      const [produtosRes, usuariosRes] = await Promise.all([
        productApi.listar(),
        authApi.listarUsuarios()
      ])

      if (produtosRes.success && produtosRes.data) {
        setProdutos(produtosRes.data as any)
      }

      if (usuariosRes.success && usuariosRes.data) {
        setUsuarios(usuariosRes.data as any)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setDistribuindo(true)

    try {
      const { productApi } = await import('@/lib/api')
      const response = await productApi.distribuir({
        produtoCompradoId: parseInt(formData.produtoId),
        usuarioId: parseInt(formData.usuarioId),
        quantidade: parseInt(formData.quantidade)
      })

      if (response.success) {
        alert(response.message || 'Produto distribuído com sucesso!')
        setFormData({
          produtoId: '',
          usuarioId: '',
          quantidade: ''
        })
        carregarDados() // Recarregar dados
      } else {
        alert(response.message || 'Erro ao distribuir produto')
      }
    } catch (error) {
      console.error('Erro ao distribuir produto:', error)
      alert('Erro de conexão. Tente novamente.')
    } finally {
      setDistribuindo(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">📦 Distribuir Produtos</h3>
        <p className="text-gray-600">Distribua produtos comprados para os atendentes</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Produto *
            </label>
            <select
              required
              value={formData.produtoId}
              onChange={(e) => setFormData({...formData, produtoId: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900"
            >
              <option value="">Selecione um produto</option>
              {produtos.map((produto) => (
                <option key={produto.id} value={produto.id}>
                  {produto.nome} (Disponível: {produto.quantidade})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Atendente *
            </label>
            <select
              required
              value={formData.usuarioId}
              onChange={(e) => setFormData({...formData, usuarioId: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900"
            >
              <option value="">Selecione um atendente</option>
              {usuarios.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nome} {usuario.isAdmin ? '(Admin)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantidade *
            </label>
            <input
              type="number"
              min="1"
              required
              value={formData.quantidade}
              onChange={(e) => setFormData({...formData, quantidade: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
              placeholder="Ex: 5"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={distribuindo}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {distribuindo ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Distribuindo...
            </>
          ) : (
            'Distribuir Produto'
          )}
        </button>
      </form>

      {produtos.length === 0 && (
        <div className="mt-8 text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum produto disponível</h3>
          <p className="text-gray-500">Cadastre produtos primeiro para poder distribuí-los</p>
        </div>
      )}

      {usuarios.length === 0 && (
        <div className="mt-8 text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum atendente cadastrado</h3>
          <p className="text-gray-500">Cadastre atendentes primeiro para poder distribuir produtos</p>
        </div>
      )}
    </div>
  )
}


