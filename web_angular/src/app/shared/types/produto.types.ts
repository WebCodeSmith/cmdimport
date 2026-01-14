export interface Produto {
  id: string;
  nome: string;
  preco: number;
  quantidade: number;
  valorAtacado?: number | null;
  valorVarejo?: number | null;
  valorRevendaEspecial?: number | null;
}

export interface ProdutoComprado {
  id: number;
  nome: string;
  descricao?: string;
  cor?: string;
  imei?: string;
  codigoBarras?: string;
  custoDolar: number;
  taxaDolar: number;
  preco: number;
  quantidade: number;
  quantidadeBackup?: number;
  fornecedor?: string;
  dataCompra: string;
  createdAt: string;
  valorAtacado?: number;
  valorVarejo?: number;
  valorRevendaEspecial?: number;
  valorParcelado10x?: number;
  categoriaId?: number;
  categoria?: CategoriaProduto;
  estoque: Array<{
    id: number;
    quantidade: number;
    ativo: boolean;
  }>;
}

export interface ProdutoComEstoque extends Produto {
  quantidade: number;
  cor?: string;
  imei?: string;
  codigoBarras?: string;
}

export interface ProdutoFormData {
  nome: string;
  descricao: string;
  cor: string;
  imei: string;
  codigoBarras: string;
  custoDolar: string;
  taxaDolar: string;
  quantidade: string;
  categoriaId?: string;
}

export interface ProdutoCompradoSimples {
  id: number;
  nome: string;
  quantidade: number;
  preco: number;
}

export interface ProdutoSugestao {
  id: number;
  nome: string;
  cor?: string;
}

export interface CategoriaProduto {
  id: number;
  nome: string;
  descricao?: string;
  icone?: string;
  cor?: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CriarCategoriaProdutoRequest {
  nome: string;
  descricao?: string;
  icone?: string;
  cor?: string;
}
