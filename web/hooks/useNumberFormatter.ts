import { useState } from 'react'

export const useNumberFormatter = () => {
  const [value, setValue] = useState('')

  const formatNumber = (inputValue: string, decimalPlaces: number = 2) => {
    // Remove tudo que não é número ou vírgula/ponto
    const numbers = inputValue.replace(/[^\d,.]/g, '')
    
    // Se não tem nada, retorna vazio
    if (!numbers) return ''
    
    // Se tem vírgula e ponto, mantém apenas o último
    const parts = numbers.split(/[,.]/)
    if (parts.length > 2) {
      const lastPart = parts.pop()
      const firstParts = parts.join('')
      return `${firstParts},${lastPart}`
    }
    
    // Se tem apenas vírgula ou ponto, mantém como está
    if (parts.length === 2) {
      return numbers
    }
    
    // Se tem apenas números, adiciona vírgula se necessário
    if (parts.length === 1) {
      const num = parts[0]
      // Se tem mais de 2 dígitos, adiciona vírgula antes dos últimos 2
      if (num.length > decimalPlaces) {
        const integerPart = num.slice(0, -decimalPlaces)
        const decimalPart = num.slice(-decimalPlaces)
        return `${integerPart},${decimalPart}`
      }
      return num
    }
    
    return numbers
  }

  const handleChange = (inputValue: string, decimalPlaces: number = 2) => {
    const formatted = formatNumber(inputValue, decimalPlaces)
    setValue(formatted)
    return formatted
  }

  const reset = () => {
    setValue('')
  }

  const getNumericValue = () => {
    return parseFloat(value.replace(',', '.')) || 0
  }

  return {
    value,
    handleChange,
    reset,
    getNumericValue
  }
}


