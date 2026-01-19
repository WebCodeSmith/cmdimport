// Interfaces de props dos componentes

import { ProdutoComEstoque, ProdutoComprado } from './produto'

export interface EstoqueSectionProps {
  usuarioId: number
}

export interface HistoricoVendasProps {
  usuarioId?: number
}

export interface CadastrarVendaSectionProps {
  usuarioId: number
}

export interface ProductDropdownProps {
  produtos: ProdutoComEstoque[]
  selectedProduct: string
  onSelect: (productId: string) => void
  placeholder?: string
  usuarioId?: number
  tipoCliente?: 'lojista' | 'consumidor' | 'revendaEspecial'
}

export interface ListarProdutosCompradosProps {
  onAbrirPrecificacao: (produto: ProdutoComprado) => void
  onEditarProduto: (produto: ProdutoComprado) => void
  onDistribuirProduto: (produto: ProdutoComprado) => void
  onProdutoAtualizado?: (atualizarFuncao: (produto: ProdutoComprado) => void) => void
}

export interface BarcodeScannerProps {
  onScan: (code: string) => void
  onClose: () => void
  isOpen: boolean
}

export interface ToastProps {
  message: string
  type: 'success' | 'error' | 'info'
  duration?: number
  onClose?: () => void
}

