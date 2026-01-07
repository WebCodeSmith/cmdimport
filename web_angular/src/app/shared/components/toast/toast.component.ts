import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toast, ToastType } from '../../types/toast.types';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html'
})
export class ToastComponent implements OnInit, OnDestroy {
  @Input() toast!: Toast;
  @Output() close = new EventEmitter<string>();

  isVisible = true;
  isAnimating = false;
  private timeoutId?: number;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    setTimeout(() => {
      this.isAnimating = true;
      this.cdr.markForCheck();
    }, 10);

    if (this.toast.duration && this.toast.duration > 0) {
      this.timeoutId = window.setTimeout(() => this.dismiss(), this.toast.duration);
    }
  }

  ngOnDestroy(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  dismiss(): void {
    this.isAnimating = false;
    setTimeout(() => {
      this.isVisible = false;
      setTimeout(() => {
        this.close.emit(this.toast.id);
      }, 300);
    }, 300);
  }

  getToastStyles(): string {
    const baseStyles = 'border-l-4 shadow-lg';
    switch (this.toast.type) {
      case 'success':
        return `${baseStyles} bg-green-50 border-green-500 text-green-900`;
      case 'error':
        return `${baseStyles} bg-red-50 border-red-500 text-red-900`;
      case 'warning':
        return `${baseStyles} bg-yellow-50 border-yellow-500 text-yellow-900`;
      case 'info':
        return `${baseStyles} bg-blue-50 border-blue-500 text-blue-900`;
      default:
        return `${baseStyles} bg-slate-50 border-slate-500 text-slate-900`;
    }
  }

  getIcon(): string {
    switch (this.toast.type) {
      case 'success':
        return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>`;
      case 'error':
        return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>`;
      case 'warning':
        return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>`;
      case 'info':
        return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>`;
      default:
        return '';
    }
  }
}

