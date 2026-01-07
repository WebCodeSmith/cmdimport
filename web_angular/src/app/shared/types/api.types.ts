export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  paginacao?: {
    paginaAtual: number;
    totalPaginas: number;
    total: number;
    limite: number;
  };
}

