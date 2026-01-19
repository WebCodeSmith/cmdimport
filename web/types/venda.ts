export interface ProdutoVenda {
  produto: string
  quantidade: string
  preco: number
  nome: string
  precoPersonalizado?: string
  usarPrecoPersonalizado?: boolean
}

export interface VendaFormData {
  clienteNome: string
  telefone: string
  endereco: string
  produto: string
  quantidade: string
  observacoes: string
  formaPagamento: string
  valorPix?: string
  valorCartao?: string
  valorDinheiro?: string
  fotoProduto?: string
  valorPersonalizado?: string
  usarValorPersonalizado?: boolean
}

export interface HistoricoVenda {
  vendaId: string
  clienteNome: string
  telefone: string
  endereco: string
  observacoes?: string
  vendedorNome: string
  vendedorEmail: string
  createdAt: string
  fotoProduto?: string
  formaPagamento: string
  valorPix?: number | null
  valorCartao?: number | null
  valorDinheiro?: number | null
  tipoCliente?: string | null
  produtos: {
    id: number
    produtoNome: string
    quantidade: number
    precoUnitario: number
    produtoDetalhes?: {
      imei?: string
      cor?: string
      descricao?: string
    } | null
  }[]
  valorTotal: number
}

export interface ProdutoItem {
  id: number
  produtoId: number | null
  produtoNome: string
  quantidade: number
  precoUnitario: number
}

export interface VendaExport {
  vendaId?: string
  id?: string | number
  clienteNome?: string
  telefone?: string
  endereco?: string
  produtos?: ProdutoItem[]
  valorTotal?: number | string
  formaPagamento?: string
  valorPix?: number | string | null
  valorCartao?: number | string | null
  valorDinheiro?: number | string | null
  vendedorNome?: string
  vendedorEmail?: string
  createdAt?: string
  observacoes?: string
  tipoCliente?: string | null
}

