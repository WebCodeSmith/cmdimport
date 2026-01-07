export type ToastType = 'success' | 'error' | 'warning' | 'info';

export type ToastPosition = 
  | 'top-right' 
  | 'top-center' 
  | 'top-left' 
  | 'bottom-right' 
  | 'bottom-center' 
  | 'bottom-left';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number; // em milissegundos, 0 = não fecha automaticamente
  position?: ToastPosition;
}

export interface ToastOptions {
  duration?: number;
  position?: ToastPosition;
}
