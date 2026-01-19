import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { EstoqueUsuario, ProdutoEstoqueCompleto } from '../../shared/types/estoque.types';
import { formatCurrency } from '../../shared/utils/formatters';

interface ProdutoAgrupado {
    nome: string;
    totalQuantidade: number;
    precoMedio: number;
    produtos: ProdutoEstoqueCompleto[];
}

@Component({
    selector: 'app-precificacao-produtos',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './precificacao-produtos.component.html'
})
export class PrecificacaoProdutosComponent implements OnInit {
    private apiService = inject(ApiService);
    private toastService = inject(ToastService);

    loading = signal<boolean>(true);
    estoqueUsuarios = signal<EstoqueUsuario[]>([]);

    ngOnInit(): void {
        this.carregarEstoqueGlobal();
    }

    async carregarEstoqueGlobal(): Promise<void> {
        try {
            this.loading.set(true);
            const response = await firstValueFrom(
                this.apiService.get<EstoqueUsuario[]>('/admin/estoque-usuarios')
            );

            if (response?.success && response.data) {
                this.estoqueUsuarios.set(response.data);
            } else {
                this.toastService.error('Erro ao carregar estoque global');
            }
        } catch (error) {
            console.error('Erro ao carregar estoque:', error);
            this.toastService.error('Erro de conexão');
        } finally {
            this.loading.set(false);
        }
    }

    produtosAgrupados = computed(() => {
        const usuarios = this.estoqueUsuarios();
        const map = new Map<string, ProdutoAgrupado>();

        usuarios.forEach(usuario => {
            usuario.produtos.forEach(produto => {
                // Ignorar produtos zerados? O usuário não especificou, mas "em estoque" sugere > 0.
                // Vou assumir que devemos mostrar tudo que veio do backend, mas o endpoint pode já filtrar.
                // O endpoint original não filtra zerados por padrão nas rotas de admin, mas vamos conferir o retorno.
                // No front de 'estoque-usuarios' tem filtro local.
                // Vou filtrar zerados para não poluir.
                if (produto.quantidade <= 0) return;

                if (!map.has(produto.nome)) {
                    map.set(produto.nome, {
                        nome: produto.nome,
                        totalQuantidade: 0,
                        precoMedio: 0,
                        produtos: []
                    });
                }

                const grupo = map.get(produto.nome)!;
                grupo.totalQuantidade += produto.quantidade;
                grupo.produtos.push(produto);
            });
        });

        // Calcular preço médio e retornar lista ordenada
        return Array.from(map.values()).map(grupo => {
            const somaPrecos = grupo.produtos.reduce((acc, p) => acc + (p.preco * p.quantidade), 0);
            grupo.precoMedio = somaPrecos / grupo.totalQuantidade;
            return grupo;
        }).sort((a, b) => a.nome.localeCompare(b.nome));
    });

    formatCurrency(val: number): string {
        return formatCurrency(val);
    }
}
