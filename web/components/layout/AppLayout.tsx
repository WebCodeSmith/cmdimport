'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import AdminSidebar from './AdminSidebar'
import Header from './Header'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Páginas que não precisam de autenticação
  const publicPages = ['/', '/register']
  const isPublicPage = publicPages.includes(pathname || '')
  
  // Verificar se está na área admin
  const isAdminPage = pathname?.startsWith('/admin') || false

  useEffect(() => {
    // Se não estiver em página pública e não tiver usuário, redirecionar para login
    if (!authLoading && !isPublicPage && !user) {
      router.push('/')
    }
  }, [user, authLoading, router, isPublicPage])

  // Fechar sidebar ao redimensionar para desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Se estiver em página pública, mostrar apenas o conteúdo
  if (isPublicPage) {
    return <>{children}</>
  }

  // Se estiver carregando, mostrar loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-600 border-t-transparent"></div>
      </div>
    )
  }

  // Se não tiver usuário, não mostrar nada (vai redirecionar)
  if (!user) {
    return null
  }

  // Layout com sidebar e header para páginas autenticadas
  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {isAdminPage ? (
        <AdminSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      ) : (
        <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      )}
      
      <div className="flex-1 flex flex-col lg:ml-0 min-w-0">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

