import { Component, inject, signal, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, SidebarComponent],
  templateUrl: './main-layout.component.html'
})
export class MainLayoutComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  user = this.authService.user;
  loading = this.authService.loading;
  mobileMenuOpen = signal<boolean>(false);

  constructor() {
    // Redirecionar se não estiver autenticado
    effect(() => {
      if (!this.loading() && !this.user()) {
        this.router.navigate(['/']);
      }
    });
  }

  ngOnInit(): void {
    // Inicializar
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.set(!this.mobileMenuOpen());
  }
}
