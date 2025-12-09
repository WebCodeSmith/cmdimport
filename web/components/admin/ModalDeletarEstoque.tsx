'use client'

interface ModalDeletarEstoqueProps {
  isOpen: boolean
  produtoNome: string
  usuarioNome: string
  deletando: boolean
  onConfirmar: () => void
  onCancelar: () => void
}

export default function ModalDeletarEstoque({
  isOpen,
  produtoNome,
  usuarioNome,
  deletando,
  onConfirmar,
  onCancelar
}: ModalDeletarEstoqueProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-xl font-bold text-red-600">🗑️ Deletar Estoque</h3>
            <p className="text-sm text-gray-600">Esta ação não pode ser desfeita</p>
          </div>
          <button
            onClick={onCancelar}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={deletando}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-900 mb-2">Atenção!</h4>
                <p className="text-sm text-red-800">
                  Tem certeza que deseja deletar o estoque de <strong>"{produtoNome}"</strong> do usuário <strong>"{usuarioNome}"</strong>?
                </p>
                <p className="text-xs text-red-700 mt-2 font-medium">
                  Esta ação irá remover o estoque permanentemente.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onCancelar}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            disabled={deletando}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={deletando}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {deletando ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deletando...
              </div>
            ) : (
              '🗑️ Confirmar Deleção'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

