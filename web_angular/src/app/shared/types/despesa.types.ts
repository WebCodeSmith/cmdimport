export interface CategoriaDespesa {
  id: number;
  nome: string;
  descricao?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Despesa {
  id: number;
  nome: string;
  valor: number;
  categoriaId: number;
  categoria?: CategoriaDespesa;
  descricao?: string;
  data: string;
  createdAt: string;
  updatedAt: string;
}

export interface CriarCategoriaDespesaRequest {
  nome: string;
  descricao?: string;
}

export interface CriarDespesaRequest {
  nome: string;
  valor: number;
  categoriaId: number;
  descricao?: string;
  data?: string;
}

export interface AtualizarDespesaRequest {
  nome?: string;
  valor?: number;
  categoriaId?: number;
  descricao?: string;
  data?: string;
}

