'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface NavItem {
  name: string
  href: string
  icon: React.ReactNode
}

interface AdminSidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export default function AdminSidebar({ isOpen, onToggle }: AdminSidebarProps) {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const navItems: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'Histórico de Vendas',
      href: '/admin',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      name: 'Cadastrar Produto',
      href: '/admin',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      name: 'Listar Produtos',
      href: '/admin',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
    },
    {
      name: 'Estoque de Usuários',
      href: '/admin',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
  ]

  const isActive = (item: NavItem) => {
    if (item.href === '/dashboard') {
      return pathname === '/dashboard' && !searchParams.get('tab')
    }
    if (item.href === '/admin') {
      const tabParam = searchParams.get('tab')
      const tabMap: Record<string, string> = {
        'Histórico de Vendas': 'historico',
        'Cadastrar Produto': 'cadastrar',
        'Listar Produtos': 'listar',
        'Estoque de Usuários': 'estoque',
      }
      const expectedTab = tabMap[item.name]
      
      // Para itens do admin, verificar se a tab corresponde
      return pathname === '/admin' && tabParam === expectedTab
    }
    return pathname?.startsWith(item.href)
  }

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen bg-white border-r border-gray-200 z-50
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto lg:h-screen
          flex flex-col
          w-64
        `}
      >
        {/* Logo e Toggle */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-pink-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            {isOpen && (
              <h1 className="text-lg font-semibold text-slate-900">Admin</h1>
            )}
          </div>
          <button
            onClick={onToggle}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item)
            return (
              <button
                key={item.name}
                onClick={() => {
                  if (item.href === '/admin') {
                    // Se for item do admin, usar tabs
                    const tabMap: Record<string, string> = {
                      'Histórico de Vendas': 'historico',
                      'Cadastrar Produto': 'cadastrar',
                      'Listar Produtos': 'listar',
                      'Estoque de Usuários': 'estoque',
                    }
                    const tab = tabMap[item.name]
                    if (tab) {
                      router.push(`/admin?tab=${tab}`)
                    } else {
                      router.push('/admin')
                    }
                  } else {
                    router.push(item.href)
                  }
                  // Fechar sidebar no mobile após navegação
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    onToggle()
                  }
                }}
                className={`
                  w-full flex items-center space-x-3 px-4 py-3 rounded-lg
                  transition-colors duration-200
                  ${
                    active
                      ? 'bg-red-50 text-red-900 font-medium border border-red-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-slate-900'
                  }
                `}
              >
                <span className={active ? 'text-red-700' : 'text-gray-500'}>
                  {item.icon}
                </span>
                <span className="text-sm">{item.name}</span>
              </button>
            )
          })}
        </nav>
      </aside>
    </>
  )
}

