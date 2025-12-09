// Utilitários de formatação compartilhados

/**
 * Formata um valor numérico como moeda brasileira (R$)
 */
export const formatCurrency = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor)
}

/**
 * Formata um valor numérico como número brasileiro (com vírgula)
 */
export const formatNumber = (valor: number, minDecimals: number = 2, maxDecimals: number = 2): string => {
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals
  })
}

/**
 * Formata uma data para o formato brasileiro (dd/mm/aaaa hh:mm)
 */
export const formatDate = (data: string | Date | null | undefined): string => {
  if (!data) return ''
  
  const date = typeof data === 'string' ? new Date(data) : data
  
  // Verificar se a data é válida
  if (isNaN(date.getTime())) return ''
  
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Formata uma data apenas com data (dd/mm/aaaa)
 */
export const formatDateOnly = (data: string | Date | null | undefined): string => {
  if (!data) return ''
  
  const date = typeof data === 'string' ? new Date(data) : data
  
  // Verificar se a data é válida
  if (isNaN(date.getTime())) return ''
  
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Formata um telefone brasileiro (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export const formatPhone = (telefone: string): string => {
  // Remove tudo que não é número
  const numbers = telefone.replace(/\D/g, '')
  
  if (numbers.length <= 2) {
    return numbers
  } else if (numbers.length <= 6) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
  } else if (numbers.length <= 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
  } else {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`
  }
}

