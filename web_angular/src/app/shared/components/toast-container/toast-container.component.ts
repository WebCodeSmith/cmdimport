import { Component, inject, computed, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';
import { Toast, ToastPosition } from '../../types/toast.types';
import { ToastComponent } from '../toast/toast.component';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, ToastComponent],
  templateUrl: './toast-container.component.html'
})
export class ToastContainerComponent {
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);
  
  toasts = this.toastService.toastsSignal;
  
  constructor() {
    effect(() => {
      this.toasts();
      setTimeout(() => this.cdr.markForCheck(), 0);
    });
  }
  
  private toastsByPosition = computed(() => {
    const map = new Map<ToastPosition, Toast[]>();
    this.toasts().forEach((toast: Toast) => {
      const position = toast.position || 'top-right';
      if (!map.has(position)) {
        map.set(position, []);
      }
      map.get(position)!.push(toast);
    });
    return map;
  });

  getToastsByPosition(position: ToastPosition): Toast[] {
    return this.toastsByPosition().get(position) || [];
  }

  onClose(id: string): void {
    this.toastService.remove(id);
  }

  getPositionClasses(position: ToastPosition): string {
    const baseClasses = 'fixed z-[9999] space-y-3 pointer-events-none';
    
    switch (position) {
      case 'top-right':
        return `${baseClasses} top-4 right-4`;
      case 'top-center':
        return `${baseClasses} top-4 left-1/2 -translate-x-1/2`;
      case 'top-left':
        return `${baseClasses} top-4 left-4`;
      case 'bottom-right':
        return `${baseClasses} bottom-4 right-4`;
      case 'bottom-center':
        return `${baseClasses} bottom-4 left-1/2 -translate-x-1/2`;
      case 'bottom-left':
        return `${baseClasses} bottom-4 left-4`;
      default:
        return `${baseClasses} top-4 right-4`;
    }
  }

  getPositions(): ToastPosition[] {
    return ['top-right', 'top-center', 'top-left', 'bottom-right', 'bottom-center', 'bottom-left'];
  }
}

