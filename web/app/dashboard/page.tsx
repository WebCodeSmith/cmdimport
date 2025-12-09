'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSearchParams, useRouter } from 'next/navigation'
import EstoqueSection from '@/components/dashboard/EstoqueSection'
import CadastrarVendaSection from '@/components/dashboard/CadastrarVendaSection'
import HistoricoVendas from '@/components/dashboard/HistoricoVendas'
import { saleApi } from '@/lib/api'
import { formatCurrency } from '@/lib/formatters'

interface DashboardStats {
  vendasHoje: number
  vendasTotal: number
  receitaHoje: number
  receitaTotal: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    vendasHoje: 0,
    vendasTotal: 0,
    receitaHoje: 0,
    receitaTotal: 0,
  })
  
  const getInitialTab = (): 'dashboard' | 'estoque' | 'cadastrar' | 'historico' => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'cadastrar') return 'cadastrar'
    if (tabParam === 'historico') return 'historico'
    if (tabParam === 'estoque') return 'estoque'
    return 'dashboard'
  }
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'estoque' | 'cadastrar' | 'historico'>(getInitialTab())
  
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'cadastrar') {
      setActiveTab('cadastrar')
    } else if (tabParam === 'historico') {
      setActiveTab('historico')
    } else if (tabParam === 'estoque') {
      setActiveTab('estoque')
    } else {
      setActiveTab('dashboard')
    }
  }, [searchParams])

  // Carregar estatísticas
  useEffect(() => {
    const carregarEstatisticas = async () => {
      if (!user) return
      
      try {
        setLoading(true)
        
        // Data de hoje
        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)
        const hojeStr = hoje.toISOString().split('T')[0]
        
        // Buscar todas as vendas do usuário
        const responseTotal = await saleApi.historico({
          pagina: 1,
          limite: 1000, // Buscar muitas para calcular total
          usuarioId: user.id,
        })
        
        // Buscar vendas de hoje
        const responseHoje = await saleApi.historico({
          pagina: 1,
          limite: 1000,
          usuarioId: user.id,
          dataInicio: hojeStr,
        })
        
        if (responseTotal.success && responseTotal.data) {
          const todasVendas = responseTotal.data as any[]
          const vendasHoje = responseHoje.success && responseHoje.data ? (responseHoje.data as any[]) : []
          
          const receitaTotal = todasVendas.reduce((acc: number, venda: any) => acc + (venda.valorTotal || 0), 0)
          const receitaHoje = vendasHoje.reduce((acc: number, venda: any) => acc + (venda.valorTotal || 0), 0)
          
          setStats({
            vendasHoje: vendasHoje.length,
            vendasTotal: todasVendas.length,
            receitaHoje,
            receitaTotal,
          })
        }
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error)
      } finally {
        setLoading(false)
      }
    }
    
    if (activeTab === 'dashboard') {
      carregarEstatisticas()
    }
  }, [user, activeTab])

  if (!user) return null

  // Se tiver tab na URL, mostrar conteúdo correspondente
  if (activeTab !== 'dashboard') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {activeTab === 'estoque' && <EstoqueSection usuarioId={user.id} />}
        {activeTab === 'cadastrar' && <CadastrarVendaSection usuarioId={user.id} />}
        {activeTab === 'historico' && <HistoricoVendas usuarioId={user.id} />}
      </div>
    )
  }

  return (
    <>
      {/* Welcome Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          Bem-vindo, {user.nome}! 👋
        </h1>
        <p className="text-gray-600 text-sm">
          Acompanhe suas vendas e estatísticas
        </p>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
              <div className="h-8 bg-gray-200 rounded w-32"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Vendas Hoje */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Vendas Hoje</p>
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.vendasHoje}</p>
            <p className="text-xs text-gray-500 mt-1">vendas realizadas hoje</p>
          </div>

          {/* Total de Vendas */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Total de Vendas</p>
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.vendasTotal}</p>
            <p className="text-xs text-gray-500 mt-1">vendas no total</p>
          </div>

          {/* Receita Hoje */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Receita Hoje</p>
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(stats.receitaHoje)}</p>
            <p className="text-xs text-gray-500 mt-1">receita de hoje</p>
          </div>

          {/* Receita Total */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Receita Total</p>
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(stats.receitaTotal)}</p>
            <p className="text-xs text-gray-500 mt-1">receita acumulada</p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/dashboard?tab=cadastrar')}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-slate-900">Cadastrar Venda</p>
              <p className="text-sm text-gray-500">Registre uma nova venda</p>
            </div>
          </button>

          <button
            onClick={() => router.push('/dashboard?tab=estoque')}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-slate-900">Consultar Estoque</p>
              <p className="text-sm text-gray-500">Veja seus produtos disponíveis</p>
            </div>
          </button>

          <button
            onClick={() => router.push('/dashboard/historico')}
            className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
          >
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-slate-900">Ver Histórico</p>
              <p className="text-sm text-gray-500">Acompanhe todas as vendas</p>
            </div>
          </button>
        </div>
      </div>
    </>
  )
}
