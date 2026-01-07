import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { HistoricoVenda } from '../../shared/types/venda.types';
import { formatCurrency, formatDate, formatPhone } from '../../shared/utils/formatters';

@Component({
  selector: 'app-historico-vendas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './historico-vendas.component.html'
})
export class HistoricoVendasComponent implements OnInit {
  private authService = inject(AuthService);
  private apiService = inject(ApiService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);

  user = this.authService.user;
  loading = signal<boolean>(true);
  vendas = signal<HistoricoVenda[]>([]);
  paginaAtual = signal<number>(1);
  totalPaginas = signal<number>(1);
  totalVendas = signal<number>(0);
  itensPorPagina = 10;
  fotoModal = signal<string | null>(null);

  filtrosForm: FormGroup;

  resumo = computed(() => {
    const vendasArray = this.vendas();
    const valorTotal = vendasArray.reduce((acc, venda) => acc + venda.valorTotal, 0);
    const ticketMedio = vendasArray.length > 0 ? valorTotal / vendasArray.length : 0;
    
    return {
      totalVendas: vendasArray.length,
      valorTotal,
      ticketMedio
    };
  });

  constructor() {
    this.filtrosForm = this.fb.group({
      cliente: [''],
      dataInicio: [''],
      dataFim: [''],
      ordenacao: ['mais-recente']
    });
  }

  ngOnInit(): void {
    this.carregarHistorico();
    
    // Recarregar quando filtros mudarem
    this.filtrosForm.valueChanges.subscribe(() => {
      this.paginaAtual.set(1);
      this.carregarHistorico();
    });
  }

  async carregarHistorico(): Promise<void> {
    const user = this.user();
    if (!user) return;

    try {
      this.loading.set(true);
      
      const formValue = this.filtrosForm.value;
      const params: any = {
        pagina: this.paginaAtual(),
        limite: this.itensPorPagina,
        ordenacao: formValue.ordenacao || 'mais-recente',
        usuarioId: user.id
      };

      if (formValue.cliente) {
        params.cliente = formValue.cliente;
      }
      if (formValue.dataInicio) {
        params.dataInicio = formValue.dataInicio;
      }
      if (formValue.dataFim) {
        params.dataFim = formValue.dataFim;
      }

      const response = await firstValueFrom(
        this.apiService.get<HistoricoVenda[]>('/vendas/historico', params)
      );

      if (response.success && response.data) {
        this.vendas.set(response.data);
        if (response.paginacao) {
          this.totalPaginas.set(response.paginacao.totalPaginas);
          this.totalVendas.set(response.paginacao.total);
        }
      } else {
        this.toastService.error(response.message || 'Erro ao carregar histórico');
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      this.toastService.error('Erro ao carregar histórico de vendas');
    } finally {
      this.loading.set(false);
    }
  }

  limparFiltros(): void {
    this.filtrosForm.reset({
      cliente: '',
      dataInicio: '',
      dataFim: '',
      ordenacao: 'mais-recente'
    });
    this.paginaAtual.set(1);
  }

  mudarPagina(pagina: number): void {
    this.paginaAtual.set(pagina);
    this.carregarHistorico();
  }

  // Usar funções do formatters compartilhado
  formatCurrency(value: number): string {
    return formatCurrency(value);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  formatPhone(phone: string): string {
    return formatPhone(phone);
  }

  getPaginas(): number[] {
    const total = this.totalPaginas();
    const maxPaginas = 5;
    const atual = this.paginaAtual();
    
    if (total <= maxPaginas) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    
    const inicio = Math.max(1, atual - Math.floor(maxPaginas / 2));
    const fim = Math.min(total, inicio + maxPaginas - 1);
    
    return Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i);
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }

  abrirFoto(fotoUrl: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.fotoModal.set(fotoUrl);
  }

  fecharFoto(): void {
    this.fotoModal.set(null);
  }
}

