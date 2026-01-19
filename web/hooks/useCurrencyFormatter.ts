import { useState, useCallback } from 'react'

export const useCurrencyFormatter = (initialValue: string = '') => {
  const [value, setValue] = useState(initialValue)

  const formatCurrency = useCallback((input: string) => {
    // Remove tudo que não é dígito
    const numbers = input.replace(/\D/g, '')
    
    if (!numbers) return ''
    
    // Converte para número e divide por 100 para ter centavos
    const amount = parseInt(numbers) / 100
    
    // Formata como moeda brasileira
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }, [])

  const handleChange = useCallback((input: string) => {
    const formatted = formatCurrency(input)
    setValue(formatted)
    // Retorna o valor numérico para uso imediato
    const numbers = input.replace(/\D/g, '')
    return numbers ? parseInt(numbers) / 100 : 0
  }, [formatCurrency])

  const getNumericValue = useCallback(() => {
    // Remove formatação e converte para número
    const numbers = value.replace(/\D/g, '')
    return numbers ? parseInt(numbers) / 100 : 0
  }, [value])

  const reset = useCallback(() => {
    setValue('')
  }, [])

  return {
    value,
    setValue,
    handleChange,
    getNumericValue,
    reset,
    formatCurrency
  }
}