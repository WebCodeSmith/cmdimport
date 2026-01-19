import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ItemPrecificacao } from '../../shared/types/precificacao.types';
import { formatCurrency } from '../../shared/utils/formatters';

@Component({
    selector: 'app-consulta-preco',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './consulta-preco.component.html'
})
export class ConsultaPrecoComponent {
    private apiService = inject(ApiService);
    private toastService = inject(ToastService);

    termoBusca = signal<string>('');
    loading = signal<boolean>(false);
    resultados = signal<ItemPrecificacao[]>([]);
    buscou = signal<boolean>(false);

    formatCurrency = formatCurrency;

    async buscar() {
        if (!this.termoBusca().trim()) return;

        this.loading.set(true);
        this.buscou.set(true);
        this.resultados.set([]);

        try {
            const response = await firstValueFrom(
                this.apiService.get<ItemPrecificacao[]>('/admin/precificacao/consultar', {
                    termo: this.termoBusca()
                })
            );

            if (response.success && response.data) {
                this.resultados.set(response.data);
            } else {
                // Se sucesso false, mas sem data, é vazio
                this.resultados.set([]);
            }
        } catch (error) {
            console.error('Erro ao buscar preços:', error);
            this.toastService.error('Erro ao realizar consulta');
        } finally {
            this.loading.set(false);
        }
    }

    onKeyDown(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            this.buscar();
        }
    }
}
