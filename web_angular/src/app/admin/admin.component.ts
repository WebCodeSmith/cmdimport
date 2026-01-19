import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MainLayoutComponent } from '../shared/components/main-layout/main-layout.component';
import { CadastrarProdutoComponent } from './cadastrar-produto/cadastrar-produto.component';
import { ListarProdutosComponent } from './listar-produtos/listar-produtos.component';
import { EstoqueUsuariosComponent } from './estoque-usuarios/estoque-usuarios.component';
import { HistoricoVendasAdminComponent } from './historico-vendas/historico-vendas.component';
import { ControleGastosComponent } from './controle-gastos/controle-gastos.component';
import { PrecificacaoProdutosComponent } from './precificacao-produtos/precificacao-produtos.component';
import { HistoricoDistribuicaoComponent } from './historico-distribuicao/historico-distribuicao.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, MainLayoutComponent, CadastrarProdutoComponent, ListarProdutosComponent, EstoqueUsuariosComponent, HistoricoVendasAdminComponent, ControleGastosComponent, PrecificacaoProdutosComponent, HistoricoDistribuicaoComponent],
  templateUrl: './admin.component.html'
})
export class AdminComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();

  activeTab = signal<'historico' | 'cadastrar-produto' | 'listar-produtos' | 'estoque-usuarios' | 'controle-gastos' | 'precificacao-produtos' | 'historico-distribuicao'>('historico');

  ngOnInit(): void {
    // Verificar tab da query string
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const tab = params['tab'];
        if (tab === 'historico') {
          this.activeTab.set('historico');
        } else if (tab === 'cadastrar-produto') {
          this.activeTab.set('cadastrar-produto');
        } else if (tab === 'listar-produtos') {
          this.activeTab.set('listar-produtos');
        } else if (tab === 'estoque-usuarios') {
          this.activeTab.set('estoque-usuarios');
        } else if (tab === 'controle-gastos') {
          this.activeTab.set('controle-gastos');
        } else if (tab === 'historico-distribuicao') {
          this.activeTab.set('historico-distribuicao');
        } else if (tab === 'precificacao-produtos') {
          this.activeTab.set('precificacao-produtos');
        } else {
          this.activeTab.set('historico');
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setActiveTab(tab: 'historico' | 'cadastrar-produto' | 'listar-produtos' | 'estoque-usuarios' | 'controle-gastos' | 'precificacao-produtos' | 'historico-distribuicao'): void {
    this.activeTab.set(tab);
    this.router.navigate(['/admin'], { queryParams: { tab } });
  }
}

