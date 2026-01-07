export interface DashboardStats {
  vendasHoje: number;
  vendasTotal: number;
  receitaHoje: number;
  receitaTotal: number;
  vendasOntem?: number;
  receitaOntem?: number;
}

export interface VendaRecente {
  id: string;
  data: string;
  valorTotal: number;
  cliente?: string;
  clienteNome?: string;
  produtoNome?: string;
  produtos?: number;
}

export interface VendaPorDia {
  dia: string;
  vendas: number;
  receita: number;
}

export interface ProdutoMaisVendido {
  nome: string;
  quantidade: number;
  receita: number;
}

