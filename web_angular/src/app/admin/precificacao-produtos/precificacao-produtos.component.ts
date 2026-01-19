import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { formatCurrency } from '../../shared/utils/formatters';
import { PanelModalComponent } from '../../shared/components/panel-modal/panel-modal.component';


interface ItemPrecificacao {
    id: number | null;
    nomeProduto: string;
    totalQuantidade: number;
    variacoes: number;
    precoMedio: number;
    valorTotalEstoque: number;
    valorDinheiroPix: number;
    valorDebito: number;
    valorCartaoVista: number;
    valorCredito5x: number;
    valorCredito10x: number;
    valorCredito12x: number;
    updatedAt: string | null;
}


@Component({
    selector: 'app-precificacao-produtos',
    standalone: true,
    imports: [CommonModule, FormsModule, PanelModalComponent],

    templateUrl: './precificacao-produtos.component.html'
})
export class PrecificacaoProdutosComponent implements OnInit {
    private apiService = inject(ApiService);
    private toastService = inject(ToastService);

    loading = signal<boolean>(true);
    itensPrecificacao = signal<ItemPrecificacao[]>([]);
    filtroNome = signal<string>('');

    // Modal state
    isModalOpen = signal<boolean>(false);
    selectedItem = signal<ItemPrecificacao | null>(null);
    modalMode = signal<'final' | 'revenda'>('final');

    ngOnInit(): void {
        this.carregarDados();
    }

    async carregarDados(): Promise<void> {
        try {
            this.loading.set(true);
            const response = await firstValueFrom(
                this.apiService.get<ItemPrecificacao[]>('/admin/precificacao')
            );

            if (response?.success && response.data) {
                this.itensPrecificacao.set(response.data);
            } else {
                this.toastService.error('Erro ao carregar precificações');
            }
        } catch (error) {
            console.error('Erro ao carregar precificação:', error);
            this.toastService.error('Erro de conexão');
        } finally {
            this.loading.set(false);
        }
    }

    itensFiltrados = computed(() => {
        const itens = this.itensPrecificacao().filter(i => i.totalQuantidade > 0);
        const filtro = this.filtroNome().toLowerCase();

        if (!filtro) return itens;

        return itens.filter(item =>
            item.nomeProduto.toLowerCase().includes(filtro)
        );
    });

    abrirModal(item: ItemPrecificacao): void {
        // Criar uma cópia para não editar o estado original antes de salvar
        this.selectedItem.set({ ...item });
        this.modalMode.set('final');
        this.isModalOpen.set(true);
    }

    fecharModal(): void {
        this.isModalOpen.set(false);
        this.selectedItem.set(null);
    }

    setModalMode(mode: 'final' | 'revenda'): void {
        this.modalMode.set(mode);
    }


    async salvarPreco(): Promise<void> {
        const item = this.selectedItem();
        if (!item) return;

        try {
            // Pequena validação
            if (item.valorDinheiroPix < 0) {
                this.toastService.error('O valor não pode ser negativo');
                return;
            }

            const response = await firstValueFrom(
                this.apiService.post<any>('/admin/precificacao', {
                    nomeProduto: item.nomeProduto,
                    valorDinheiroPix: Number(item.valorDinheiroPix),
                    valorDebito: Number(item.valorDebito),
                    valorCartaoVista: Number(item.valorCartaoVista),
                    valorCredito5x: Number(item.valorCredito5x),
                    valorCredito10x: Number(item.valorCredito10x),
                    valorCredito12x: Number(item.valorCredito12x)
                })
            );

            if (response?.success) {
                this.toastService.success(`Preços salvos para: ${item.nomeProduto}`);
                this.fecharModal();
                this.carregarDados(); // Recarregar para garantir sincronia
            } else {
                this.toastService.error('Erro ao salvar preços');
            }
        } catch (error) {
            console.error('Erro ao salvar:', error);
            this.toastService.error('Erro de conexão ao salvar');
        }
    }


    // Atalho para preencher outros campos baseado no PIX (regra de negócio opcional, mas útil)
    aplicarSugestao(item: ItemPrecificacao): void {
        const base = Number(item.valorDinheiroPix);
        if (base > 0 && item.valorCartaoVista === 0) {
            // Exemplo de regra simples: +5% débito, +10% crédito... 
            // O usuário não pediu regra automática, então vou deixar manual por enquanto
            // mas preparei o método caso ele peça.
            // item.valorCartaoVista = base * 1.10;
        }
    }

    formatCurrency(val: number): string {
        return formatCurrency(val);
    }
}
