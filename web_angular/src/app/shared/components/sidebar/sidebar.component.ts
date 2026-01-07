import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  name: string;
  href: string;
  icon: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  @Input() isOpen = signal<boolean>(false);
  @Output() toggle = new EventEmitter<void>();

  user = this.authService.user;

  navItems: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
    },
    {
      name: 'Estoque',
      href: '/dashboard?tab=estoque',
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
    },
    {
      name: 'Cadastrar Venda',
      href: '/dashboard?tab=cadastrar',
      icon: 'M12 4v16m8-8H4'
    },
    {
      name: 'Histórico',
      href: '/dashboard?tab=historico',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
    },
    {
      name: 'Painel Admin',
      href: '/admin',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      adminOnly: true
    }
  ];

  get filteredNavItems(): NavItem[] {
    return this.navItems.filter(item => !item.adminOnly || this.user()?.isAdmin);
  }

  navigate(href: string): void {
    if (href.includes('?')) {
      const [path, query] = href.split('?');
      const params = new URLSearchParams(query);
      this.router.navigate([path], { queryParams: Object.fromEntries(params) });
    } else {
      this.router.navigate([href]);
    }
    this.toggle.emit(); // Fecha o menu mobile após navegar
  }

  isActive(href: string): boolean {
    const currentUrl = this.router.url;
    if (href === '/dashboard') {
      return currentUrl === '/dashboard' || currentUrl.startsWith('/dashboard?tab=');
    }
    if (href === '/admin') {
      return currentUrl === '/admin' || currentUrl.startsWith('/admin?tab=');
    }
    if (href.includes('?tab=')) {
      const tab = href.split('tab=')[1];
      if (href.startsWith('/admin')) {
        return currentUrl.includes(`/admin?tab=${tab}`);
      }
      return currentUrl.includes(`/dashboard?tab=${tab}`);
    }
    return currentUrl.startsWith(href);
  }
}

