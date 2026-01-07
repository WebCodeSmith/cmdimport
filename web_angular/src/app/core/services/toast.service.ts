import { Injectable, signal } from '@angular/core';
import { Toast, ToastOptions, ToastType } from '../../shared/types/toast.types';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts: Toast[] = [];
  toastsSignal = signal<Toast[]>([]);

  private notify(): void {
    this.toastsSignal.set([...this.toasts]);
  }

  show(message: string, type: ToastType = 'info', options?: ToastOptions): string {
    const id = this.generateId();
    const toast: Toast = {
      id,
      message,
      type,
      duration: options?.duration ?? 5000,
      position: options?.position ?? 'top-right'
    };

    this.toasts.push(toast);
    this.notify();

    if (toast.duration && toast.duration > 0) {
      setTimeout(() => this.remove(id), toast.duration);
    }

    return id;
  }

  success(message: string, options?: ToastOptions): string {
    return this.show(message, 'success', options);
  }

  error(message: string, options?: ToastOptions): string {
    return this.show(message, 'error', options);
  }

  warning(message: string, options?: ToastOptions): string {
    return this.show(message, 'warning', options);
  }

  info(message: string, options?: ToastOptions): string {
    return this.show(message, 'info', options);
  }

  remove(id: string): void {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
    this.notify();
  }

  clear(): void {
    this.toasts = [];
    this.notify();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

