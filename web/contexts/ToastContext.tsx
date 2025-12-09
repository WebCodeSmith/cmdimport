'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useToast } from '@/components/ui/Toast'
import { ToastContextType } from '@/types/toast'

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const { showToast, ToastContainer } = useToast()

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

export function useToastContext() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastProvider')
  }
  return context
}
