import { useState } from 'react'

export const usePhoneFormatter = () => {
  const [phone, setPhone] = useState('')

  const formatPhone = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '')
    
    // Limita a 11 dígitos
    const limitedNumbers = numbers.slice(0, 11)
    
    // Aplica a formatação
    if (limitedNumbers.length <= 2) {
      return limitedNumbers
    } else if (limitedNumbers.length <= 6) {
      return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2)}`
    } else if (limitedNumbers.length <= 10) {
      return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2, 6)}-${limitedNumbers.slice(6)}`
    } else {
      return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2, 7)}-${limitedNumbers.slice(7)}`
    }
  }

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value)
    setPhone(formatted)
    return formatted
  }

  const resetPhone = () => {
    setPhone('')
  }

  return {
    phone,
    handlePhoneChange,
    resetPhone
  }
}
