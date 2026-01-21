import { Component, Output, EventEmitter, inject, signal, ElementRef, ViewChild, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  name: string;
  href: string;
  children?: { name: string; href: string }[];
  adminOnly?: boolean;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html'
})
export class HeaderComponent implements AfterViewInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  @Output() menuClick = new EventEmitter<void>();
  @ViewChild('dropdownRef') dropdownRef!: ElementRef;
  @ViewChild('navDropdownRef') navDropdownRef!: ElementRef;

  user = this.authService.user;
  dropdownOpen = signal<boolean>(false);
  mobileMenuOpen = signal<boolean>(false);
  openDropdown = signal<string | null>(null);

  private clickListener?: (event: MouseEvent) => void;

  navItems: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard'
    },
    {
      name: 'Operações',
      href: '/dashboard',
      children: [
        { name: 'Cadastrar Venda', href: '/dashboard?tab=cadastrar' },
        { name: 'Histórico', href: '/dashboard?tab=historico' },
        { name: 'Estoque', href: '/dashboard?tab=estoque' }
      ]
    },
    {
      name: 'Admin',
      href: '/admin',
      adminOnly: true,
      children: [
        { name: 'Histórico de Vendas', href: '/admin?tab=historico' },
        { name: 'Cadastrar Produto', href: '/admin?tab=cadastrar-produto' },
        { name: 'Listar Produtos', href: '/admin?tab=listar-produtos' },
        { name: 'Estoque de Usuários', href: '/admin?tab=estoque-usuarios' },
        { name: 'Controle de Gastos', href: '/admin?tab=controle-gastos' }
      ]
    }
  ];

  get filteredNavItems(): NavItem[] {
    return this.navItems.filter(item => !item.adminOnly || this.user()?.isAdmin);
  }

  ngAfterViewInit(): void {
    this.clickListener = (event: MouseEvent) => {
      if (this.dropdownRef && !this.dropdownRef.nativeElement.contains(event.target)) {
        this.closeDropdown();
      }
      if (this.navDropdownRef && !this.navDropdownRef.nativeElement.contains(event.target)) {
        this.openDropdown.set(null);
      }
    };
    document.addEventListener('click', this.clickListener);
  }

  ngOnDestroy(): void {
    if (this.clickListener) {
      document.removeEventListener('click', this.clickListener);
    }
  }

  toggleDropdown(): void {
    this.dropdownOpen.set(!this.dropdownOpen());
  }

  closeDropdown(): void {
    this.dropdownOpen.set(false);
  }

  toggleNavDropdown(itemName: string): void {
    if (this.openDropdown() === itemName) {
      this.openDropdown.set(null);
    } else {
      this.openDropdown.set(itemName);
    }
  }

  handleLogout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
    this.closeDropdown();
  }

  navigate(href: string): void {
    if (href.includes('?')) {
      const [path, query] = href.split('?');
      const params = new URLSearchParams(query);
      this.router.navigate([path], { queryParams: Object.fromEntries(params) });
    } else {
      this.router.navigate([href]);
    }
    this.mobileMenuOpen.set(false);
    this.openDropdown.set(null);
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

  get userInitial(): string {
    return this.user()?.nome?.charAt(0).toUpperCase() || 'U';
  }
}
