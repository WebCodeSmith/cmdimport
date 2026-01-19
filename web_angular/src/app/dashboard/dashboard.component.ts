import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { ApiService } from '../core/services/api.service';
import { MainLayoutComponent } from '../shared/components/main-layout/main-layout.component';
import { DashboardStats, VendaRecente, VendaPorDia, ProdutoMaisVendido } from '../shared/types/dashboard.types';
import { CadastrarVendaComponent } from './cadastrar-venda/cadastrar-venda.component';
import { HistoricoVendasComponent } from './historico-vendas/historico-vendas.component';
import { EstoqueComponent } from './estoque/estoque.component';
import { ConsultaPrecoComponent } from './consulta-preco/consulta-preco.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MainLayoutComponent, CadastrarVendaComponent, HistoricoVendasComponent, EstoqueComponent, ConsultaPrecoComponent],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private apiService = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  user = this.authService.user;
  loading = signal<boolean>(true);
  stats = signal<DashboardStats>({
    vendasHoje: 0,
    vendasTotal: 0,
    receitaHoje: 0,
    receitaTotal: 0
  });

  vendasRecentes = signal<VendaRecente[]>([]);
  vendasPorDia = signal<VendaPorDia[]>([]);
  produtosMaisVendidos = signal<ProdutoMaisVendido[]>([]);

  activeTab = signal<'dashboard' | 'estoque' | 'cadastrar' | 'historico'>('dashboard');

  ngOnInit(): void {
    this.carregarDados();

    // Verificar tab da query string
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab === 'cadastrar') {
        this.activeTab.set('cadastrar');
      } else if (tab === 'historico') {
        this.activeTab.set('historico');
      } else if (tab === 'estoque') {
        this.activeTab.set('estoque');
      } else {
        this.activeTab.set('dashboard');
      }
    });
  }

  private async carregarDados(): Promise<void> {
    const user = this.user();
    if (!user) return;

    try {
      this.loading.set(true);

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const hojeStr = hoje.toISOString().split('T')[0];

      const ontem = new Date(hoje);
      ontem.setDate(ontem.getDate() - 1);
      const ontemStr = ontem.toISOString().split('T')[0];

      const seteDiasAtras = new Date(hoje);
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
      const seteDiasAtrasStr = seteDiasAtras.toISOString().split('T')[0];

      // Buscar todas as vendas
      const responseTotal = this.apiService.get<any[]>('/vendas/historico', {
        pagina: 1,
        limite: 1000,
        usuarioId: user.id
      });

      // Buscar vendas de hoje
      const responseHoje = this.apiService.get<any[]>('/vendas/historico', {
        pagina: 1,
        limite: 1000,
        usuarioId: user.id,
        dataInicio: hojeStr
      });

      // Buscar vendas de ontem
      const responseOntem = this.apiService.get<any[]>('/vendas/historico', {
        pagina: 1,
        limite: 1000,
        usuarioId: user.id,
        dataInicio: ontemStr,
        dataFim: hojeStr
      });

      // Buscar vendas dos últimos 7 dias
      const responseSeteDias = this.apiService.get<any[]>('/vendas/historico', {
        pagina: 1,
        limite: 1000,
        usuarioId: user.id,
        dataInicio: seteDiasAtrasStr
      });

      const [totalResult, hojeResult, ontemResult, seteDiasResult] = await Promise.all([
        firstValueFrom(responseTotal),
        firstValueFrom(responseHoje),
        firstValueFrom(responseOntem),
        firstValueFrom(responseSeteDias)
      ]);

      if (totalResult?.success && totalResult.data) {
        const todasVendas = totalResult.data;
        const vendasHoje = hojeResult?.success && hojeResult.data ? hojeResult.data : [];
        const vendasOntem = ontemResult?.success && ontemResult.data ? ontemResult.data : [];
        const vendasSeteDias = seteDiasResult?.success && seteDiasResult.data ? seteDiasResult.data : [];

        const receitaTotal = todasVendas.reduce((acc: number, venda: any) => acc + (venda.valorTotal || 0), 0);
        const receitaHoje = vendasHoje.reduce((acc: number, venda: any) => acc + (venda.valorTotal || 0), 0);
        const receitaOntem = vendasOntem.reduce((acc: number, venda: any) => acc + (venda.valorTotal || 0), 0);

        this.stats.set({
          vendasHoje: vendasHoje.length,
          vendasTotal: todasVendas.length,
          receitaHoje,
          receitaTotal,
          vendasOntem: vendasOntem.length,
          receitaOntem
        });

        // Vendas recentes (últimas 5)
        const recentes = vendasHoje
          .slice(0, 5)
          .map((v: any) => ({
            id: v.vendaId || v.id,
            data: v.createdAt || v.data,
            valorTotal: v.valorTotal || 0,
            clienteNome: v.clienteNome || v.cliente || 'Cliente',
            produtoNome: v.produtos?.[0]?.produtoNome || v.produtos?.[0]?.nome || 'Produto',
            produtos: v.produtos?.length || v.itens?.length || 0
          }));
        this.vendasRecentes.set(recentes);

        // Vendas por dia (últimos 7 dias) - sempre em ordem: Dom, Seg, Ter, Qua, Qui, Sex, Sáb
        const vendasPorDiaMap = new Map<string, { vendas: number; receita: number; diaSemana: string; ordem: number }>();
        const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

        // Inicializar mapa com os últimos 7 dias
        for (let i = 6; i >= 0; i--) {
          const data = new Date(hoje);
          data.setDate(data.getDate() - i);
          const dataStr = data.toISOString().split('T')[0];
          const diaSemana = dias[data.getDay()];
          const ordem = data.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb

          vendasPorDiaMap.set(dataStr, { vendas: 0, receita: 0, diaSemana, ordem });
        }

        // Preencher com dados reais
        vendasSeteDias.forEach((venda: any) => {
          const dataVenda = (venda.data || venda.createdAt)?.split('T')[0];
          if (dataVenda && vendasPorDiaMap.has(dataVenda)) {
            const atual = vendasPorDiaMap.get(dataVenda)!;
            vendasPorDiaMap.set(dataVenda, {
              vendas: atual.vendas + 1,
              receita: atual.receita + (venda.valorTotal || 0),
              diaSemana: atual.diaSemana,
              ordem: atual.ordem
            });
          }
        });

        // Criar array ordenado do mais antigo para o mais recente (cronologicamente)
        const vendasPorDiaArray: VendaPorDia[] = [];
        for (let i = 6; i >= 0; i--) {
          const data = new Date(hoje);
          data.setDate(data.getDate() - i);
          const dataStr = data.toISOString().split('T')[0];
          const dados = vendasPorDiaMap.get(dataStr);

          if (dados) {
            vendasPorDiaArray.push({
              dia: dados.diaSemana,
              vendas: dados.vendas,
              receita: dados.receita
            });
          }
        }
        this.vendasPorDia.set(vendasPorDiaArray);

        // Produtos mais vendidos (simplificado - baseado nas vendas recentes)
        const produtosMap = new Map<string, { quantidade: number; receita: number; nome: string }>();
        vendasSeteDias.forEach((venda: any) => {
          const itens = venda.itens || venda.produtos || [];
          itens.forEach((item: any) => {
            const nome = item.produtoNome || item.nome || 'Produto';
            const quantidade = item.quantidade || 1;
            const preco = item.preco || item.valorUnitario || 0;

            if (produtosMap.has(nome)) {
              const atual = produtosMap.get(nome)!;
              produtosMap.set(nome, {
                quantidade: atual.quantidade + quantidade,
                receita: atual.receita + (preco * quantidade),
                nome
              });
            } else {
              produtosMap.set(nome, {
                quantidade,
                receita: preco * quantidade,
                nome
              });
            }
          });
        });

        const produtosArray = Array.from(produtosMap.values())
          .sort((a, b) => b.quantidade - a.quantidade)
          .slice(0, 5);
        this.produtosMaisVendidos.set(produtosArray);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      this.loading.set(false);
    }
  }

  setActiveTab(tab: 'dashboard' | 'estoque' | 'cadastrar' | 'historico'): void {
    this.activeTab.set(tab);
    if (tab === 'dashboard') {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/dashboard'], { queryParams: { tab } });
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  getCrescimentoVendas(): number {
    const stats = this.stats();
    if (!stats.vendasOntem || stats.vendasOntem === 0) return 0;
    return ((stats.vendasHoje - stats.vendasOntem) / stats.vendasOntem) * 100;
  }

  getCrescimentoReceita(): number {
    const stats = this.stats();
    if (!stats.receitaOntem || stats.receitaOntem === 0) return 0;
    return ((stats.receitaHoje - stats.receitaOntem) / stats.receitaOntem) * 100;
  }

  getMaxVendas(): number {
    const vendas = this.vendasPorDia();
    if (vendas.length === 0) return 1;
    return Math.max(...vendas.map(v => v.vendas), 1);
  }

  getBarHeight(vendas: number): number {
    const max = this.getMaxVendas();
    return max > 0 ? (vendas / max) * 100 : 0;
  }

  abs(value: number): number {
    return Math.abs(value);
  }
}
