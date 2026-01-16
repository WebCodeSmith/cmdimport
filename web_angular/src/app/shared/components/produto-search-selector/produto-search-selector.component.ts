import { Component, Input, Output, EventEmitter, signal, computed, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Produto } from '../../types/produto.types';
import { formatCurrency } from '../../utils/formatters';

@Component({
    selector: 'app-produto-search-selector',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule],
    templateUrl: './produto-search-selector.component.html',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => ProdutoSearchSelectorComponent),
            multi: true
        }
    ]
})
export class ProdutoSearchSelectorComponent implements ControlValueAccessor {
    @Input() produtos: Produto[] = [];
    @Input() placeholder: string = 'Pesquisar por Nome, IMEI ou Código...';
    @Output() produtoSelecionado = new EventEmitter<Produto>();

    value: string | null = null;
    isDisabled = false;

    searchTerm = signal('');
    isOpen = signal(false);

    // Produtos filtrados
    filteredProdutos = computed(() => {
        const term = this.searchTerm().toLowerCase().trim();
        if (!term) return this.produtos;

        return this.produtos.filter(p => {
            const nome = p.nome.toLowerCase();
            const imei = p.imei?.toLowerCase() || '';
            const codigo = p.codigoBarras?.toLowerCase() || '';

            return nome.includes(term) || imei.includes(term) || codigo.includes(term);
        });
    });

    onChange: any = () => { };
    onTouched: any = () => { };

    writeValue(value: any): void {
        this.value = value;
        if (value && this.produtos.length > 0) {
            const prod = this.produtos.find(p => p.id === value);
            if (prod) {
                this.searchTerm.set(prod.nome);
            }
        } else if (!value) {
            this.searchTerm.set('');
        }
    }

    registerOnChange(fn: any): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: any): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.isDisabled = isDisabled;
    }

    toggleDropdown() {
        if (this.isDisabled) return;
        this.isOpen.set(true);
    }

    closeDropdown() {
        // Delay para permitir que o click/mousedown no item aconteça
        setTimeout(() => {
            this.isOpen.set(false);
            this.validateSelection();
            this.onTouched();
        }, 200);
    }

    validateSelection() {
        if (this.value) {
            const prod = this.produtos.find(p => p.id === this.value);
            if (prod && this.searchTerm() !== prod.nome) {
                this.searchTerm.set(prod.nome);
            }
        } else {
            // Se o usuário digitou algo mas não selecionou, limpar
            this.searchTerm.set('');
        }
    }

    selectProduto(produto: Produto) {
        this.value = produto.id;
        this.searchTerm.set(produto.nome);
        this.onChange(this.value);
        this.produtoSelecionado.emit(produto);
        this.isOpen.set(false);
    }

    onSearchInput(event: any) {
        this.searchTerm.set(event.target.value);
        if (!this.isOpen()) {
            this.isOpen.set(true);
        }
    }

    // Atualiza o searchTerm se a lista de produtos mudar (ex: carregamento inicial)
    ngOnChanges() {
        if (this.value && this.produtos.length > 0) {
            const prod = this.produtos.find(p => p.id === this.value);
            if (prod) {
                this.searchTerm.set(prod.nome);
            }
        }
    }

    formatCurrency(val: number): string {
        return formatCurrency(val);
    }
}
