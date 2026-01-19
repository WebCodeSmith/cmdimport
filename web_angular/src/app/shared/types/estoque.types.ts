export interface EstoqueItem {
  id: number;
  nome: string;
  descricao?: string;
  cor?: string;
  imei?: string;
  codigoBarras?: string;
  quantidade: number;
  preco: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EstoqueItemExtended extends EstoqueItem {
  codigoBarras?: string;
}

export interface ProdutoEstoque {
  id: number;
  nome: string;
  quantidade: number;
  preco: number;
  cor?: string;
  imei?: string;
  codigoBarras?: string;
  descricao?: string;
}

export interface ProdutoEstoqueCompleto {
  id: number;
  produtoCompradoId: number;
  nome: string;
  quantidade: number;
  preco: number;
  cor?: string;
  imei?: string;
  codigoBarras?: string;
  descricao?: string;
}

export interface EstoqueUsuario {
  id: number;
  nome: string;
  email: string;
  isAdmin: boolean;
  totalProdutos: number;
  totalQuantidade: number;
  produtos: ProdutoEstoqueCompleto[];
}

