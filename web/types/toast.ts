export interface ToastContextType {
  showToast: (message: string, type: 'success' | 'error' | 'info') => void
}

