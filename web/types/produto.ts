export interface Produto {
  id: string
  nome: string
  preco: number
  quantidade: number
}

export interface ProdutoComprado {
  id: number
  nome: string
  descricao?: string
  cor?: string
  imei?: string
  codigoBarras?: string
  custoDolar: number
  taxaDolar: number
  preco: number
  quantidade: number
  quantidadeBackup?: number
  fornecedor?: string
  dataCompra: string
  createdAt: string
  estoque: Array<{
    id: number
    quantidade: number
    ativo: boolean
  }>
}

export interface ProdutoComEstoque extends Produto {
  quantidade: number
  cor?: string
  imei?: string
  codigoBarras?: string
}

export interface ProdutoFormData {
  nome: string
  descricao: string
  cor: string
  imei: string
  codigoBarras: string
  custoDolar: string
  taxaDolar: string
  quantidade: string
}

export interface ProdutoCompradoSimples {
  id: number
  nome: string
  quantidade: number
  preco: number
}

