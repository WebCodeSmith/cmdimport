// Cliente API para comunicação com o backend Go

// Detectar URL da API baseado no ambiente
const getApiUrl = () => {
  // Se tiver variável de ambiente, usar ela
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  
  // Se estiver no cliente (browser), verificar a URL atual
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    // Se não for localhost, assumir que está em produção e usar URL relativa
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return '/api'
    }
  }
  
  // Padrão para desenvolvimento local
  return 'http://localhost:8080/api'
}

const API_URL = getApiUrl()

interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  paginacao?: {
    paginaAtual: number
    totalPaginas: number
    total: number
    limite: number
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { params, ...fetchOptions } = options

  // Construir URL com query params
  let url = `${API_URL}${endpoint}`
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value))
      }
    })
    const queryString = searchParams.toString()
    if (queryString) {
      url += `?${queryString}`
    }
  }

  // Headers padrão
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  }

  // Adicionar token de autenticação se existir
  const user = typeof window !== 'undefined' ? localStorage.getItem('user') : null
  if (user) {
    try {
      const userData = JSON.parse(user)
      // Se houver token, adicionar ao header
      if (userData.token) {
        headers['Authorization'] = `Bearer ${userData.token}`
      }
      // Adicionar user ID se necessário
      if (userData.id) {
        headers['X-User-ID'] = String(userData.id)
      }
    } catch (e) {
      // Ignorar erro de parsing
    }
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        message: data.message || `Erro ${response.status}: ${response.statusText}`,
      }
    }

    return {
      success: true,
      ...data,
    }
  } catch (error) {
    console.error('Erro na requisição:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro de conexão',
    }
  }
}

// API de Autenticação
export const authApi = {
  login: async (email: string, senha: string) => {
    const response = await apiRequest<{ user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    })
    
    // Se a resposta tem user diretamente (compatibilidade)
    if (response.success && (response as any).user) {
      return {
        ...response,
        data: {
          user: (response as any).user,
        },
      }
    }
    
    return response
  },

  register: async (nome: string, email: string, senha: string) => {
    return apiRequest<{ user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ nome, email, senha }),
    })
  },

  listarUsuarios: async () => {
    return apiRequest<any[]>('/admin/usuarios')
  },

  listarAtendentes: async () => {
    return apiRequest<any[]>('/admin/atendentes')
  },
}

// API de Produtos
export const productApi = {
  listar: async (params?: {
    pagina?: number
    limite?: number
    busca?: string
    dataInicio?: string
    dataFim?: string
    ocultarEstoqueZerado?: boolean
  }) => {
    return apiRequest<any[]>('/admin/produtos', { params })
  },

  cadastrar: async (data: any) => {
    return apiRequest<any>('/admin/produtos/cadastrar', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  buscarPorID: async (id: number) => {
    return apiRequest<any>(`/admin/produtos/${id}`)
  },

  atualizar: async (id: number, data: any) => {
    return apiRequest<any>(`/admin/produtos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  atualizarPrecificacao: async (id: number, data: any) => {
    return apiRequest<any>(`/admin/produtos/${id}/precificacao`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  distribuir: async (data: any) => {
    return apiRequest<any>('/admin/distribuir', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  redistribuir: async (data: any) => {
    return apiRequest<any>('/admin/redistribuir', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

// API de Estoque
export const stockApi = {
  listar: async (usuarioId: number) => {
    return apiRequest<any[]>('/estoque', {
      params: { usuarioId },
    })
  },

  buscarPorCodigoBarras: async (codigoBarras: string, usuarioId: number) => {
    return apiRequest<any[]>('/estoque/buscar-por-codigo-barras', {
      params: { codigoBarras, usuarioId },
    })
  },

  buscarPorIMEI: async (imei: string, usuarioId: number) => {
    return apiRequest<any[]>('/estoque/buscar-por-imei', {
      params: { imei, usuarioId },
    })
  },

  listarEstoqueUsuarios: async () => {
    return apiRequest<any[]>('/admin/estoque-usuarios')
  },

  deletarEstoque: async (estoqueId: number) => {
    return apiRequest<any>(`/admin/estoque-usuarios/${estoqueId}`, {
      method: 'DELETE',
    })
  },
}

// API de Vendas
export const saleApi = {
  cadastrar: async (data: any) => {
    return apiRequest<any>('/vendas/cadastrar', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  historico: async (params?: {
    pagina?: number
    limite?: number
    ordenacao?: string
    usuarioId?: number
    cliente?: string
    dataInicio?: string
    dataFim?: string
  }) => {
    return apiRequest<any[]>('/vendas/historico', { params })
  },

  buscarPorID: async (id: number) => {
    return apiRequest<any>(`/vendas/venda/${id}`)
  },

  historicoAdmin: async (params?: {
    pagina?: number
    limite?: number
    ordenacao?: string
    cliente?: string
    imeiCodigo?: string
    dataInicio?: string
    dataFim?: string
  }) => {
    return apiRequest<any[]>('/admin/historico', { params })
  },

  resumoVendedores: async (params?: {
    dataInicio?: string
    dataFim?: string
  }) => {
    return apiRequest<any[]>('/admin/historico/resumo-vendedores', { params })
  },

  buscarPorIDAdmin: async (id: number) => {
    return apiRequest<any>(`/admin/venda/${id}`)
  },
}

// API de Upload
export const uploadApi = {
  foto: async (file: File) => {
    const formData = new FormData()
    formData.append('foto', file)

    const response = await fetch(`${API_URL}/upload/foto`, {
      method: 'POST',
      body: formData,
    })

    return response.json()
  },
}

// Exportar função genérica também
export { apiRequest }

