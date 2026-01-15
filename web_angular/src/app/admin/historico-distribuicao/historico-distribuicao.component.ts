import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { HistoricoDistribuicao } from '../../shared/types/produto.types';
import { formatDate as formatDateUtil } from '../../shared/utils/formatters';
import { firstValueFrom } from 'rxjs';

@Component({
    selector: 'app-historico-distribuicao',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './historico-distribuicao.component.html'
})
export class HistoricoDistribuicaoComponent implements OnInit {
    historico = signal<HistoricoDistribuicao[]>([]);
    loading = signal<boolean>(true);

    constructor(
        private apiService: ApiService,
        private toastService: ToastService
    ) { }

    ngOnInit() {
        this.carregarHistorico();
    }

    async carregarHistorico() {
        try {
            this.loading.set(true);
            const response = await firstValueFrom(
                this.apiService.get<HistoricoDistribuicao[]>('/admin/historico-distribuicao')
            );
            if (response.success && response.data) {
                this.historico.set(response.data);
            }
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
            this.toastService.error('Erro ao carregar histórico de distribuição');
        } finally {
            this.loading.set(false);
        }
    }

    formatDateTime(date: string): string {
        return formatDateUtil(date);
    }
}
