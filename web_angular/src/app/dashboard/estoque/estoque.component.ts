import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { EstoqueItemExtended } from '../../shared/types/estoque.types';

@Component({
  selector: 'app-estoque',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './estoque.component.html'
})
export class EstoqueComponent implements OnInit {
  private authService = inject(AuthService);
  private apiService = inject(ApiService);
  private toastService = inject(ToastService);

  user = this.authService.user;
  loading = signal<boolean>(true);
  estoque = signal<EstoqueItemExtended[]>([]);
  mostrarEstoquesZerados = signal<boolean>(false);
  produtoExpandido = signal<number | null>(null);

  estoqueFiltrado = computed(() => {
    const estoqueArray = this.estoque();
    if (this.mostrarEstoquesZerados()) {
      return estoqueArray;
    }
    return estoqueArray.filter(item => item.quantidade > 0);
  });

  totalUnidades = computed(() => {
    return this.estoque().reduce((total, item) => total + item.quantidade, 0);
  });

  produtosComEstoque = computed(() => {
    return this.estoque().filter(item => item.quantidade > 0).length;
  });

  ngOnInit(): void {
    this.carregarEstoque();
  }

  async carregarEstoque(): Promise<void> {
    const user = this.user();
    if (!user) return;

    try {
      this.loading.set(true);
      
      // Sempre buscar todos os produtos (incluindo zerados) para filtrar no frontend
      const response = await firstValueFrom(
        this.apiService.get<EstoqueItemExtended[]>('/estoque', {
          usuarioId: user.id
        })
      );

      if (response?.success && response.data) {
        this.estoque.set(response.data);
      } else {
        this.toastService.error(response?.message || 'Erro ao carregar estoque');
      }
    } catch (error) {
      console.error('Erro ao carregar estoque:', error);
      this.toastService.error('Erro de conexão. Tente novamente.');
    } finally {
      this.loading.set(false);
    }
  }

  toggleMostrarEstoquesZerados(): void {
    this.mostrarEstoquesZerados.set(!this.mostrarEstoquesZerados());
    // Não precisa recarregar, o filtro é feito no computed
  }

  toggleDescricao(produtoId: number): void {
    if (this.produtoExpandido() === produtoId) {
      this.produtoExpandido.set(null);
    } else {
      this.produtoExpandido.set(produtoId);
    }
  }

  getStatus(quantidade: number): string {
    if (quantidade === 0) return 'Zerado';
    if (quantidade <= 2) return 'Crítico';
    return 'Em estoque';
  }

  getStatusClass(quantidade: number): string {
    if (quantidade === 0) return 'bg-red-100 text-red-800';
    if (quantidade <= 2) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }
}

