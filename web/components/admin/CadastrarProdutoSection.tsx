'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNumberFormatter } from '@/hooks/useNumberFormatter'
import { useToastContext } from '@/contexts/ToastContext'
import { ProdutoFormData } from '@/types/produto'

interface ProdutoSugestao {
  id: number
  nome: string
  cor?: string
}

export default function CadastrarProdutoSection() {
  const [formData, setFormData] = useState<ProdutoFormData>({
    nome: '',
    descricao: '',
    cor: '',
    imei: '',
    codigoBarras: '',
    custoDolar: '',
    taxaDolar: '',
    quantidade: ''
  })
  const [loading, setLoading] = useState(false)
  const [tipoIdentificacao, setTipoIdentificacao] = useState<'imei' | 'codigoBarras' | 'ambos'>('ambos')
  const { showToast } = useToastContext()
  
  // Estados para autocomplete
  const [sugestoes, setSugestoes] = useState<ProdutoSugestao[]>([])
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Hooks para formatação de números
  const custoFormatter = useNumberFormatter()
  const taxaFormatter = useNumberFormatter()

  // Calcular preço automaticamente
  const calcularPreco = () => {
    const custo = custoFormatter.getNumericValue()
    const taxa = taxaFormatter.getNumericValue()
    return (custo * taxa).toFixed(2).replace('.', ',')
  }

  // Buscar produtos para autocomplete
  const buscarProdutos = useCallback(async (termo: string) => {
    if (termo.length < 2) {
      setSugestoes([])
      setMostrarSugestoes(false)
      return
    }

    try {
      setBuscando(true)
      const { productApi } = await import('@/lib/api')
      const response = await productApi.listar({
        pagina: 1,
        limite: 10,
        busca: termo
      })

      if (response.success && response.data) {
        // Extrair apenas nomes únicos de produtos (normalizando para comparação)
        const nomesUnicos = new Map<string, ProdutoSugestao>()
        response.data.forEach((produto: any) => {
          // Normalizar nome: trim e lowercase para comparação
          const nomeNormalizado = (produto.nome || '').trim().toLowerCase()
          if (nomeNormalizado && !nomesUnicos.has(nomeNormalizado)) {
            nomesUnicos.set(nomeNormalizado, {
              id: produto.id,
              nome: produto.nome.trim(), // Manter nome original formatado
              cor: produto.cor
            })
          }
        })
        setSugestoes(Array.from(nomesUnicos.values()))
        setMostrarSugestoes(true)
      } else {
        setSugestoes([])
        setMostrarSugestoes(false)
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error)
    } finally {
      setBuscando(false)
    }
  }, [])

  // Debounce na busca
  const handleNomeChange = (valor: string) => {
    setFormData({...formData, nome: valor})
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      buscarProdutos(valor)
    }, 300)
  }

  // Selecionar sugestão
  const selecionarSugestao = (produto: ProdutoSugestao) => {
    setFormData({...formData, nome: produto.nome})
    setSugestoes([])
    setMostrarSugestoes(false)
    if (inputRef.current) {
      inputRef.current.blur()
    }
  }

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setMostrarSugestoes(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Cleanup do debounce
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validação para modo "ambos" - pelo menos um campo deve ser preenchido
    if (tipoIdentificacao === 'ambos') {
      if (!formData.imei.trim() && !formData.codigoBarras.trim()) {
        showToast('Por favor, preencha pelo menos um dos campos: IMEI ou Código de Barras', 'error')
        return
      }
    }
    
    // Validar campos obrigatórios
    const custoDolar = custoFormatter.getNumericValue()
    const taxaDolar = taxaFormatter.getNumericValue()
    const quantidade = parseInt(formData.quantidade) || 0
    
    if (!formData.nome.trim()) {
      showToast('O nome do produto é obrigatório', 'error')
      return
    }
    
    if (custoDolar <= 0) {
      showToast('O custo em dólar deve ser maior que zero', 'error')
      return
    }
    
    if (taxaDolar <= 0) {
      showToast('A taxa do dólar deve ser maior que zero', 'error')
      return
    }
    
    if (quantidade <= 0) {
      showToast('A quantidade deve ser maior que zero', 'error')
      return
    }
    
    setLoading(true)
    
    try {
      const { productApi } = await import('@/lib/api')
      
      // Preparar dados para envio
      const dadosEnvio: any = {
        nome: formData.nome.trim(),
        custoDolar,
        taxaDolar,
        quantidade,
        tipoIdentificacao
      }
      
      // Adicionar campos opcionais apenas se preenchidos
      if (formData.descricao.trim()) {
        dadosEnvio.descricao = formData.descricao.trim()
      }
      
      if (formData.cor.trim()) {
        dadosEnvio.cor = formData.cor.trim()
      }
      
      // IMEI e Código de Barras baseado no tipo de identificação
      if (tipoIdentificacao === 'imei') {
        // Modo IMEI: IMEI é obrigatório
        if (!formData.imei.trim()) {
          showToast('O IMEI é obrigatório quando o tipo de identificação é IMEI', 'error')
          setLoading(false)
          return
        }
        dadosEnvio.imei = formData.imei.trim()
      } else if (tipoIdentificacao === 'codigoBarras') {
        // Modo Código de Barras: Código de Barras é obrigatório
        if (!formData.codigoBarras.trim()) {
          showToast('O Código de Barras é obrigatório quando o tipo de identificação é Código de Barras', 'error')
          setLoading(false)
          return
        }
        dadosEnvio.codigoBarras = formData.codigoBarras.trim()
      } else if (tipoIdentificacao === 'ambos') {
        // Modo Ambos: pelo menos um deve ser preenchido (já validado acima)
        if (formData.imei.trim()) {
          dadosEnvio.imei = formData.imei.trim()
        }
        if (formData.codigoBarras.trim()) {
          dadosEnvio.codigoBarras = formData.codigoBarras.trim()
        }
      }
      
      const response = await productApi.cadastrar(dadosEnvio)

      if (response.success && response.data) {
        showToast(
          `Compra registrada com sucesso! Produto: ${response.data.nome} - Preço: R$ ${response.data.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} - Quantidade: ${response.data.quantidade} - Produto adicionado ao estoque!`,
          'success'
        )
        setFormData({
          nome: '',
          descricao: '',
          cor: '',
          imei: '',
          codigoBarras: '',
          custoDolar: '',
          taxaDolar: '',
          quantidade: ''
        })
        setSugestoes([])
        setMostrarSugestoes(false)
        custoFormatter.reset()
        taxaFormatter.reset()
      } else {
        showToast(response.message || 'Erro ao cadastrar produto', 'error')
      }
    } catch (error) {
      console.error('Erro ao cadastrar produto:', error)
      showToast('Erro de conexão. Tente novamente.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">🛒 Cadastrar Nova Compra</h3>
        <p className="text-gray-600">Registre produtos comprados que serão adicionados ao estoque</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Produto *
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                required
                value={formData.nome}
                onChange={(e) => handleNomeChange(e.target.value)}
                onFocus={() => {
                  if (sugestoes.length > 0) {
                    setMostrarSugestoes(true)
                  }
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                placeholder="Ex: iPhone 15 Pro ou Redmi"
              />
              {buscando && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
              
              {/* Dropdown de sugestões */}
              {mostrarSugestoes && sugestoes.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-auto"
                >
                  {sugestoes.map((produto) => (
                    <button
                      key={produto.id}
                      type="button"
                      onClick={() => selecionarSugestao(produto)}
                      className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{produto.nome}</div>
                      {produto.cor && (
                        <div className="text-sm text-gray-500">Cor: {produto.cor}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cor
            </label>
            <input
              type="text"
              value={formData.cor}
              onChange={(e) => setFormData({...formData, cor: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
              placeholder="Ex: Azul, Preto, Branco"
            />
          </div>
        </div>

        {/* Seção de Identificação */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tipo de Identificação
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="tipoIdentificacao"
                  value="imei"
                  checked={tipoIdentificacao === 'imei'}
                  onChange={(e) => setTipoIdentificacao(e.target.value as 'imei' | 'codigoBarras' | 'ambos')}
                  className="mr-2 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">IMEI</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="tipoIdentificacao"
                  value="codigoBarras"
                  checked={tipoIdentificacao === 'codigoBarras'}
                  onChange={(e) => setTipoIdentificacao(e.target.value as 'imei' | 'codigoBarras' | 'ambos')}
                  className="mr-2 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Código de Barras</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="tipoIdentificacao"
                  value="ambos"
                  checked={tipoIdentificacao === 'ambos'}
                  onChange={(e) => setTipoIdentificacao(e.target.value as 'imei' | 'codigoBarras' | 'ambos')}
                  className="mr-2 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Ambos (Opcionais)</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Campo IMEI */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IMEI {tipoIdentificacao === 'imei' ? '*' : ''}
              </label>
              <input
                type="text"
                required={tipoIdentificacao === 'imei'}
                value={formData.imei}
                onChange={(e) => setFormData({...formData, imei: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                placeholder="Ex: 123456789012345"
                maxLength={15}
                disabled={tipoIdentificacao === 'codigoBarras'}
              />
              {tipoIdentificacao === 'codigoBarras' && (
                <p className="text-xs text-gray-500 mt-1">Campo desabilitado - apenas Código de Barras selecionado</p>
              )}
            </div>

            {/* Campo Código de Barras */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de Barras {tipoIdentificacao === 'codigoBarras' ? '*' : ''}
              </label>
              <input
                type="text"
                required={tipoIdentificacao === 'codigoBarras'}
                value={formData.codigoBarras}
                onChange={(e) => setFormData({...formData, codigoBarras: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                placeholder="Ex: 1234567890123"
                maxLength={50}
                disabled={tipoIdentificacao === 'imei'}
              />
              {tipoIdentificacao === 'imei' && (
                <p className="text-xs text-gray-500 mt-1">Campo desabilitado - apenas IMEI selecionado</p>
              )}
            </div>
          </div>

          {/* Mensagem informativa para modo "Ambos" */}
          {tipoIdentificacao === 'ambos' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                💡 <strong>Modo Ambos:</strong> Você pode preencher IMEI, Código de Barras ou ambos. 
                Pelo menos um dos campos deve ser preenchido para identificar o produto.
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Taxa do Dólar *0
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">R$</span>
              </div>
              <input
                type="text"
                required
                value={taxaFormatter.value}
                onChange={(e) => {
                  const formatted = taxaFormatter.handleChange(e.target.value, 4)
                  setFormData({...formData, taxaDolar: formatted})
                }}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                placeholder="0,0000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custo em Dólar *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="text"
                required
                value={custoFormatter.value}
                onChange={(e) => {
                  const formatted = custoFormatter.handleChange(e.target.value, 2)
                  setFormData({...formData, custoDolar: formatted})
                }}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
                placeholder="0,00"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preço Calculado (Real)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">R$</span>
              </div>
              <input
                type="text"
                value={calcularPreco()}
                disabled
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-100 text-gray-900 cursor-not-allowed"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Custo × Taxa = {custoFormatter.value || '0'} × {taxaFormatter.value || '0'} = R$ {calcularPreco()}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantidade *
            </label>
            <input
              type="number"
              min="0"
              required
              value={formData.quantidade}
              onChange={(e) => setFormData({...formData, quantidade: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
              placeholder="0"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <input
              type="text"
              value={formData.descricao}
              onChange={(e) => setFormData({...formData, descricao: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-500"
              placeholder="Descrição opcional do produto"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Cadastrando...
            </>
          ) : (
            'Registrar Compra'
          )}
        </button>
      </form>
    </div>
  )
}