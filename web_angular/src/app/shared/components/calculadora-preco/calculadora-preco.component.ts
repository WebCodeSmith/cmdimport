import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-calculadora-preco',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './calculadora-preco.component.html',
    styles: [`
    .calc-input {
      @apply w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-white;
    }
    .label-accent {
      @apply block text-sm font-medium text-slate-600 mb-1;
    }
  `]
})
export class CalculadoraPrecoComponent {
    // Signals para Exibição (Inputs)
    precoProdutoBaseStr = signal<string>('');
    precoVendaManualStr = signal<string>('');
    custoTotalManualStr = signal<string>('');

    // Signals Numéricos (para cálculos)
    precoProdutoBase = computed(() => this.parseMoeda(this.precoProdutoBaseStr()));
    precoVendaManual = computed(() => this.parseMoeda(this.precoVendaManualStr()));
    custoTotalManual = computed(() => this.parseMoeda(this.custoTotalManualStr()));

    custoLogistica = computed(() => {
        const base = this.precoProdutoBase();
        if (base <= 0) return 0;
        return (base * 0.11) + 60;
    });
    custoTotal = computed(() => this.precoProdutoBase() + this.custoLogistica());
    precoSugerido = computed(() => {
        const total = this.custoTotal();
        if (total <= 0) return 0;
        // Margem de 30% -> Preço = Custo / (1 - 0.3)
        return total / 0.7;
    });

    margemFinal = computed(() => {
        const venda = this.precoVendaManual();
        const custo = this.custoTotalManual();
        if (venda <= 0) return 0;
        return ((venda - custo) / venda) * 100;
    });

    formatCurrency(value: number): string {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    parseMoeda(valor: string): number {
        if (!valor) return 0;
        return parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0;
    }

    formatarMoeda(event: Event, signalToUpdate: any): void {
        const input = event.target as HTMLInputElement;
        let valor = input.value.replace(/\D/g, ''); // Remove tudo que não é dígito

        if (!valor) {
            signalToUpdate.set('');
            return;
        }

        // Converte para número e divide por 100 para ter 2 casas decimais
        const numero = parseFloat(valor) / 100;

        // Formata para português brasileiro
        const valorFormatado = numero.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        signalToUpdate.set(valorFormatado);
    }
}
