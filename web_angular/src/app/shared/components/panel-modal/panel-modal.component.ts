import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PanelMenuItem {
  id: string;
  label: string;
  icon: string;
  active?: boolean;
  disabled?: boolean;
}

@Component({
  selector: 'app-panel-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './panel-modal.component.html',
  styleUrls: ['./panel-modal.component.scss']
})
export class PanelModalComponent {
  @Input() isOpen: boolean = false;
  @Input() title: string = 'Configurações';
  @Input() subtitle: string = '';
  @Input() menuItems: PanelMenuItem[] = [];
  @Input() selectedMenuItemId: string = '';
  @Input() maxWidth: string = 'max-w-5xl';
  @Input() height: string = 'h-[98vh]';
  @Input() showSidebar: boolean = true;
  
  @Output() close = new EventEmitter<void>();
  @Output() menuItemSelected = new EventEmitter<string>();

  onClose() {
    this.close.emit();
  }

  onMenuItemClick(itemId: string) {
    this.selectedMenuItemId = itemId;
    this.menuItemSelected.emit(itemId);
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.onClose();
    }
  }
}

