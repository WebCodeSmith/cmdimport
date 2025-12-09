'use client'

import { useState, useEffect, useRef } from 'react'
import { Produto, ProdutoComEstoque } from '@/types/produto'
import BarcodeScanner from './BarcodeScanner'
import { ProductDropdownProps } from '@/types/components'

export default function ProductDropdown({ 
  produtos, 
  selectedProduct, 
  onSelect, 
  placeholder = "Selecione um produto",
  usuarioId
}: ProductDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [buscaManual, setBuscaManual] = useState('')
  const [mostrarBuscaManual, setMostrarBuscaManual] = useState(false)
  const [showProductSelectionModal, setShowProductSelectionModal] = useState(false)
  const [produtosEncontrados, setProdutosEncontrados] = useState<ProdutoComEstoque[]>([])
  const [codigoEscaneado, setCodigoEscaneado] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const getSelectedProduct = (): ProdutoComEstoque | undefined => {
    return produtos.find(p => p.id === selectedProduct)
  }

  const handleSelect = (productId: string) => {
    onSelect(productId)
    setShowDropdown(false)
  }

  const mostrarNotificacaoErro = (codigo: string) => {
    const notification = document.createElement('div')
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #dc2626;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        max-width: 300px;
        font-family: system-ui, -apple-system, sans-serif;
      ">
        <div style="font-weight: 600; margin-bottom: 4px;">❌ Produto não encontrado</div>
        <div style="font-size: 14px;">Código: ${codigo}</div>
      </div>
    `
    document.body.appendChild(notification)
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification)
      }
    }, 3000)
  }

  const buscarProdutoPorCodigo = async (code: string) => {
    if (!usuarioId) return null

    try {
      const { stockApi } = await import('@/lib/api')
      
      // Primeiro tentar buscar por IMEI
      const responseImei = await stockApi.buscarPorIMEI(code, usuarioId)
      if (responseImei.success && responseImei.data && responseImei.data.length > 0) {
        return responseImei.data // Retorna array de produtos
      }

      // Se não encontrar por IMEI, tentar buscar por código de barras
      const responseCodigo = await stockApi.buscarPorCodigoBarras(code, usuarioId)
      if (responseCodigo.success && responseCodigo.data && responseCodigo.data.length > 0) {
        return responseCodigo.data // Retorna array de produtos
      }

      return null
    } catch (error) {
      console.error('Erro ao buscar produto:', error)
      return null
    }
  }

  const handleBarcodeScan = async (code: string) => {
    const produtosEncontrados = await buscarProdutoPorCodigo(code)
    
    if (produtosEncontrados && produtosEncontrados.length > 0) {
      // Se encontrou apenas um produto, selecionar automaticamente
      if (produtosEncontrados.length === 1) {
        onSelect(produtosEncontrados[0].id.toString())
        setShowScanner(false)
      } else {
        // Se encontrou múltiplos produtos, mostrar modal de seleção
        setProdutosEncontrados(produtosEncontrados)
        setCodigoEscaneado(code)
        setShowProductSelectionModal(true)
        setShowScanner(false)
      }
    } else {
      mostrarNotificacaoErro(code)
      setShowScanner(false) // Fechar o modal mesmo se não encontrar
    }
  }

  const handleSelectProductFromModal = (productId: string) => {
    onSelect(productId)
    setShowProductSelectionModal(false)
    setProdutosEncontrados([])
    setCodigoEscaneado('')
  }

  const handleCancelProductSelection = () => {
    setShowProductSelectionModal(false)
    setProdutosEncontrados([])
    setCodigoEscaneado('')
  }

  const handleBuscaManual = async () => {
    if (!buscaManual.trim()) return

    const produtosEncontrados = await buscarProdutoPorCodigo(buscaManual.trim())
    
    if (produtosEncontrados && produtosEncontrados.length > 0) {
      // Se encontrou apenas um produto, selecionar automaticamente
      if (produtosEncontrados.length === 1) {
        onSelect(produtosEncontrados[0].id.toString())
        setBuscaManual('')
        setMostrarBuscaManual(false)
      } else {
        // Se encontrou múltiplos produtos, mostrar modal de seleção
        setProdutosEncontrados(produtosEncontrados)
        setCodigoEscaneado(buscaManual.trim())
        setShowProductSelectionModal(true)
        setBuscaManual('')
        setMostrarBuscaManual(false)
      }
    } else {
      mostrarNotificacaoErro(buscaManual.trim())
    }
  }

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex">
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 text-left flex items-center justify-between"
        >
          <span className={selectedProduct ? 'text-gray-900' : 'text-gray-500'}>
            {selectedProduct ? (
              (() => {
                const produto = getSelectedProduct()
                if (!produto) return placeholder
                
                if (produto.quantidade === 0) {
                  return produto.nome + ' - ZERADO NO ESTOQUE'
                }
                
                let detalhes = `Qtd: ${produto.quantidade}`
                if (produto.imei) {
                  detalhes += ` | IMEI: ${produto.imei}`
                }
                if (produto.cor) {
                  detalhes += ` | Cor: ${produto.cor}`
                }
                
                return produto.nome + ' - ' + detalhes
              })()
            ) : placeholder}
          </span>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          className="px-3 py-3 border border-l-0 border-gray-300 bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Escanear código de barras/IMEI"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        </button>
        
        <button
          type="button"
          onClick={() => setMostrarBuscaManual(!mostrarBuscaManual)}
          className="px-3 py-3 border border-l-0 border-gray-300 rounded-r-xl bg-green-50 hover:bg-green-100 text-green-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500"
          title="Buscar por código manual"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>
      
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-auto">
          {produtos
            .filter((produto) => produto.quantidade > 0) // Filtrar produtos com estoque zerado
            .map((produto) => (
              <button
                key={produto.id}
                type="button"
                onClick={() => handleSelect(produto.id)}
                className="w-full px-4 py-3 text-left transition-colors duration-200 first:rounded-t-xl last:rounded-b-xl hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
              >
                <div className="font-medium text-gray-900">
                  {produto.nome}
                </div>
                <div className="text-sm text-gray-600">
                  {(() => {
                    let detalhes = `Qtd: ${produto.quantidade}`
                    if (produto.imei) {
                      detalhes += ` | IMEI: ${produto.imei}`
                    }
                    if (produto.cor) {
                      detalhes += ` | Cor: ${produto.cor}`
                    }
                    return detalhes
                  })()}
                </div>
              </button>
            ))}
        </div>
      )}

      {/* Interface de busca manual */}
      {mostrarBuscaManual && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg p-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar por IMEI ou Código de Barras
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={buscaManual}
                  onChange={(e) => setBuscaManual(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleBuscaManual()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Digite o IMEI ou código de barras"
                />
                <button
                  type="button"
                  onClick={handleBuscaManual}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  Buscar
                </button>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              💡 A busca funciona tanto para IMEI quanto para código de barras
            </div>
          </div>
        </div>
      )}
      
      <BarcodeScanner
        isOpen={showScanner}
        onScan={handleBarcodeScan}
        onClose={() => setShowScanner(false)}
      />

      {/* Modal de Seleção de Produto */}
      {showProductSelectionModal && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[10000]"
          onClick={handleCancelProductSelection}
        >
          <div 
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                📱 Múltiplos Produtos Encontrados
              </h3>
              <button
                onClick={handleCancelProductSelection}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Código escaneado:</strong> {codigoEscaneado}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Foram encontrados {produtosEncontrados.length} produtos com este código. Selecione o produto desejado:
              </p>
            </div>

            <div className="space-y-3">
              {produtosEncontrados.map((produto) => (
                <button
                  key={produto.id}
                  onClick={() => handleSelectProductFromModal(produto.id.toString())}
                  className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{produto.nome}</h4>
                      {produto.cor && (
                        <p className="text-sm text-gray-600">Cor: {produto.cor}</p>
                      )}
                      <p className="text-sm text-gray-600">
                        Estoque: {produto.quantidade} unidades
                      </p>
                      {produto.imei && (
                        <p className="text-xs text-gray-500">IMEI: {produto.imei}</p>
                      )}
                      {produto.codigoBarras && (
                        <p className="text-xs text-gray-500">Código: {produto.codigoBarras}</p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold text-indigo-600">
                        R$ {produto.preco.toLocaleString('pt-BR', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6">
              <button
                onClick={handleCancelProductSelection}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

