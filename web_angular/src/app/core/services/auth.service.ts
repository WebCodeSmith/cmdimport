import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { Observable, tap } from 'rxjs';
import { User } from '../../shared/types/user.types';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiService = inject(ApiService);
  private router = inject(Router);
  
  // Signal para estado do usuário (Angular 17+)
  user = signal<User | null>(null);
  loading = signal<boolean>(false);

  constructor() {
    // Carregar usuário do localStorage ao inicializar
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.user.set(user);
      } catch (e) {
        console.error('Erro ao carregar usuário do localStorage:', e);
        localStorage.removeItem('user');
      }
    }
  }

  login(email: string, senha: string): Observable<any> {
    this.loading.set(true);
    return this.apiService.post<{ user: User }>('/auth/login', { email, senha }).pipe(
      tap({
        next: (response) => {
          if (response.success && response.data) {
            const userData = (response.data as any).user || response.data;
            this.user.set(userData);
            localStorage.setItem('user', JSON.stringify(userData));
            this.loading.set(false);
          } else {
            this.loading.set(false);
            throw new Error(response.message || 'Erro ao fazer login');
          }
        },
        error: () => {
          this.loading.set(false);
        }
      })
    );
  }

  register(nome: string, email: string, senha: string): Observable<any> {
    this.loading.set(true);
    return this.apiService.post<{ user: User }>('/auth/register', { nome, email, senha }).pipe(
      tap({
        next: (response) => {
          if (response.success && response.data) {
            const userData = (response.data as any).user || response.data;
            this.user.set(userData);
            localStorage.setItem('user', JSON.stringify(userData));
            this.loading.set(false);
          } else {
            this.loading.set(false);
            throw new Error(response.message || 'Erro ao registrar');
          }
        },
        error: () => {
          this.loading.set(false);
        }
      })
    );
  }

  logout(): void {
    this.user.set(null);
    localStorage.removeItem('user');
    this.router.navigate(['/']);
  }

  isAuthenticated(): boolean {
    return this.user() !== null;
  }

  isAdmin(): boolean {
    return this.user()?.isAdmin === true;
  }
}

