import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { HistoricoVenda, ResumoVendedor } from '../../shared/types/venda.types';
import { formatCurrency, formatDateOnly, formatPhone } from '../../shared/utils/formatters';
import { PanelModalComponent } from '../../shared/components/panel-modal/panel-modal.component';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-historico-vendas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PanelModalComponent],
  templateUrl: './historico-vendas.component.html'
})
export class HistoricoVendasAdminComponent implements OnInit, OnDestroy {
  private apiService = inject(ApiService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  loading = signal<boolean>(true);
  vendas = signal<HistoricoVenda[]>([]);
  abaAtiva = signal<'historico' | 'resumo'>('historico');
  paginaAtual = signal<number>(1);
  totalPaginas = signal<number>(1);
  totalVendas = signal<number>(0);
  resumoVendedores = signal<ResumoVendedor[]>([]);
  exportando = signal<boolean>(false);
  modalDetalhes = signal<boolean>(false);
  vendaSelecionada = signal<HistoricoVenda | null>(null);
  carregandoDetalhes = signal<boolean>(false);
  fotoModal = signal<string | null>(null);
  modoEdicao = signal<boolean>(false);
  modalConfirmacaoDeletar = signal<boolean>(false);
  deletando = signal<boolean>(false);
  editando = signal<boolean>(false);
  formularioEdicao: FormGroup;
  
  produtoEditando = signal<number | null>(null);
  produtoEditandoForm: FormGroup;
  modalConfirmacaoDeletarProduto = signal<boolean>(false);
  produtoParaDeletar = signal<number | null>(null);
  deletandoProduto = signal<boolean>(false);
  
  itensPorPagina = 10;
  filtrosForm: FormGroup;

  totalVendedores = computed(() => this.resumoVendedores().length);
  
  valorTotalVendido = computed(() => {
    return this.resumoVendedores().reduce((acc, v) => acc + v.totalValor, 0);
  });
  
  totalVendasResumo = computed(() => {
    return this.resumoVendedores().reduce((acc, v) => acc + v.totalVendas, 0);
  });

  constructor() {
    this.filtrosForm = this.fb.group({
      cliente: [''],
      imeiCodigo: [''],
      dataInicio: [''],
      dataFim: [''],
      ordenacao: ['data']
    });

    this.formularioEdicao = this.fb.group({
      clienteNome: ['', Validators.required],
      telefone: ['', Validators.required],
      endereco: [''],
      observacoes: ['']
    });

    this.produtoEditandoForm = this.fb.group({
      quantidade: [1, [Validators.required, Validators.min(1)]],
      precoUnitario: [0, [Validators.required, Validators.min(0.01)]]
    });
  }

  ngOnInit(): void {
    this.carregarDados();
    
    // Recarregar quando filtros mudarem
    this.filtrosForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.paginaAtual.set(1);
        this.carregarDados();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  mudarAba(aba: 'historico' | 'resumo'): void {
    this.abaAtiva.set(aba);
    this.carregarDados();
  }

  async carregarDados(): Promise<void> {
    if (this.abaAtiva() === 'historico') {
      await this.carregarHistorico();
    } else {
      await this.carregarResumoVendedores();
    }
  }

  async carregarHistorico(): Promise<void> {
    try {
      this.loading.set(true);
      
      const formValue = this.filtrosForm.value;
      const params: any = {
        pagina: this.paginaAtual(),
        limite: this.itensPorPagina,
        ordenacao: formValue.ordenacao || 'data'
      };

      if (formValue.cliente) {
        params.cliente = formValue.cliente;
      }
      if (formValue.imeiCodigo) {
        params.imeiCodigo = formValue.imeiCodigo;
      }
      if (formValue.dataInicio) {
        params.dataInicio = formValue.dataInicio;
      }
      if (formValue.dataFim) {
        params.dataFim = formValue.dataFim;
      }

      const response = await firstValueFrom(
        this.apiService.get<HistoricoVenda[]>('/admin/historico', params)
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

  async carregarResumoVendedores(): Promise<void> {
    try {
      this.loading.set(true);
      
      const formValue = this.filtrosForm.value;
      const params: any = {};

      if (formValue.dataInicio) {
        params.dataInicio = formValue.dataInicio;
      }
      if (formValue.dataFim) {
        params.dataFim = formValue.dataFim;
      }

      const response = await firstValueFrom(
        this.apiService.get<ResumoVendedor[]>('/admin/historico/resumo-vendedores', params)
      );

      if (response.success && response.data) {
        this.resumoVendedores.set(response.data);
      } else {
        this.toastService.error(response.message || 'Erro ao carregar resumo');
      }
    } catch (error) {
      console.error('Erro ao carregar resumo:', error);
      this.toastService.error('Erro ao carregar resumo de vendedores');
    } finally {
      this.loading.set(false);
    }
  }

  limparFiltros(): void {
    this.filtrosForm.reset({
      cliente: '',
      imeiCodigo: '',
      dataInicio: '',
      dataFim: '',
      ordenacao: 'data'
    });
    this.paginaAtual.set(1);
  }

  mudarPagina(pagina: number): void {
    this.paginaAtual.set(pagina);
    this.carregarHistorico();
  }

  getPaginasParaMostrar(): (number | string)[] {
    const total = this.totalPaginas();
    const atual = this.paginaAtual();
    const maxPaginas = 5;
    
    if (total <= maxPaginas) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    
    const inicio = Math.max(1, atual - Math.floor(maxPaginas / 2));
    const fim = Math.min(total, inicio + maxPaginas - 1);
    
    const paginas: (number | string)[] = [];
    
    if (inicio > 1) {
      paginas.push(1);
      if (inicio > 2) {
        paginas.push('...');
      }
    }
    
    for (let i = inicio; i <= fim; i++) {
      paginas.push(i);
    }
    
    if (fim < total) {
      if (fim < total - 1) {
        paginas.push('...');
      }
      paginas.push(total);
    }
    
    return paginas;
  }

  getRangeTexto(): string {
    const total = this.totalVendas();
    const atual = this.paginaAtual();
    const limite = this.itensPorPagina;
    const inicio = (atual - 1) * limite + 1;
    const fim = Math.min(atual * limite, total);
    
    return `Mostrando ${inicio} a ${fim} de ${total} vendas`;
  }

  async abrirDetalhes(produtoId: number): Promise<void> {
    try {
      this.carregandoDetalhes.set(true);
      this.modalDetalhes.set(true);
      
      // Buscar detalhes da venda pelo ID do produto
      const venda = this.vendas().find(v => 
        v.produtos.some(p => p.id === produtoId)
      );
      
      if (venda) {
        // O endpoint espera o ID numérico do primeiro registro de histórico da venda
        // Usamos o ID do primeiro produto, que é o ID numérico do registro no banco
        const primeiroProdutoId = venda.produtos[0]?.id;
        
        if (primeiroProdutoId) {
          try {
            // Buscar detalhes completos da venda usando o ID numérico
            const response = await firstValueFrom(
              this.apiService.get<HistoricoVenda>(`/admin/venda/${primeiroProdutoId}`)
            );
            
            if (response.success && response.data) {
              this.vendaSelecionada.set(response.data);
            } else {
              // Se a API falhar, usar os dados que já temos
              this.vendaSelecionada.set(venda);
            }
          } catch (apiError) {
            // Se houver erro na API, usar os dados que já temos
            console.warn('Erro ao buscar detalhes da API, usando dados locais:', apiError);
            this.vendaSelecionada.set(venda);
          }
        } else {
          // Se não tiver ID, usar os dados que já temos
          this.vendaSelecionada.set(venda);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
      this.toastService.error('Erro ao carregar detalhes da venda');
      this.modalDetalhes.set(false);
    } finally {
      this.carregandoDetalhes.set(false);
    }
  }

  fecharDetalhes(): void {
    this.modalDetalhes.set(false);
    this.vendaSelecionada.set(null);
    this.fotoModal.set(null);
    this.modoEdicao.set(false);
    this.formularioEdicao.reset();
    this.produtoEditando.set(null);
    this.produtoEditandoForm.reset();
  }

  onModalClose(): void {
    this.fecharDetalhes();
  }

  entrarModoEdicao(): void {
    const venda = this.vendaSelecionada();
    if (venda) {
      this.formularioEdicao.patchValue({
        clienteNome: venda.clienteNome,
        telefone: venda.telefone,
        endereco: venda.endereco,
        observacoes: venda.observacoes || ''
      });
      this.modoEdicao.set(true);
    }
  }

  cancelarEdicao(): void {
    this.modoEdicao.set(false);
    this.formularioEdicao.reset();
  }

  async salvarEdicao(): Promise<void> {
    const venda = this.vendaSelecionada();
    if (!venda) return;

    try {
      this.editando.set(true);
      const formValue = this.formularioEdicao.value;
      
      const primeiroProdutoId = venda.produtos[0]?.id;
      if (!primeiroProdutoId) {
        this.toastService.error('ID da venda não encontrado');
        return;
      }

      const response = await firstValueFrom(
        this.apiService.put(`/admin/venda/${primeiroProdutoId}`, formValue)
      );

      if (!response.success) {
        throw new Error(response.message || 'Erro ao atualizar venda');
      }

      // Atualizar localmente
      const vendaAtualizada = {
        ...venda,
        clienteNome: formValue.clienteNome,
        telefone: formValue.telefone,
        endereco: formValue.endereco,
        observacoes: formValue.observacoes
      };
      
      this.vendaSelecionada.set(vendaAtualizada);
      
      // Atualizar na lista também
      const vendas = this.vendas();
      const index = vendas.findIndex(v => v.vendaId === venda.vendaId);
      if (index !== -1) {
        vendas[index] = vendaAtualizada;
        this.vendas.set([...vendas]);
      }

      this.toastService.success('Venda atualizada com sucesso!');
      this.modoEdicao.set(false);
    } catch (error: any) {
      console.error('Erro ao salvar edição:', error);
      this.toastService.error(error?.error?.message || error?.message || 'Erro ao atualizar venda');
    } finally {
      this.editando.set(false);
    }
  }

  abrirModalConfirmacaoDeletar(): void {
    this.modalConfirmacaoDeletar.set(true);
  }

  fecharModalConfirmacaoDeletar(): void {
    this.modalConfirmacaoDeletar.set(false);
  }

  async confirmarDeletar(): Promise<void> {
    const venda = this.vendaSelecionada();
    if (!venda) return;

    try {
      this.deletando.set(true);
      
      const primeiroProdutoId = venda.produtos[0]?.id;
      if (!primeiroProdutoId) {
        this.toastService.error('ID da venda não encontrado');
        return;
      }

      const response = await firstValueFrom(
        this.apiService.delete(`/admin/venda/${primeiroProdutoId}`)
      );

      if (!response.success) {
        throw new Error(response.message || 'Erro ao deletar venda');
      }

      // Remover da lista localmente
      const vendas = this.vendas();
      const vendasFiltradas = vendas.filter(v => v.vendaId !== venda.vendaId);
      this.vendas.set(vendasFiltradas);
      this.totalVendas.set(this.totalVendas() - 1);

      this.toastService.success('Venda deletada com sucesso!');
      this.fecharModalConfirmacaoDeletar();
      this.fecharDetalhes();
    } catch (error: any) {
      console.error('Erro ao deletar venda:', error);
      this.toastService.error(error?.error?.message || error?.message || 'Erro ao deletar venda');
    } finally {
      this.deletando.set(false);
    }
  }

  abrirFoto(fotoUrl: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.fotoModal.set(fotoUrl);
  }

  entrarModoEdicaoProduto(produtoId: number): void {
    const venda = this.vendaSelecionada();
    if (!venda) return;

    const produto = venda.produtos.find(p => p.id === produtoId);
    if (produto) {
      this.produtoEditandoForm.patchValue({
        quantidade: produto.quantidade,
        precoUnitario: produto.precoUnitario
      });
      this.produtoEditando.set(produtoId);
    }
  }

  calcularSubtotalProduto(): number {
    const quantidade = this.produtoEditandoForm.get('quantidade')?.value || 0;
    const precoUnitario = this.produtoEditandoForm.get('precoUnitario')?.value || 0;
    return quantidade * precoUnitario;
  }

  cancelarEdicaoProduto(): void {
    this.produtoEditando.set(null);
    this.produtoEditandoForm.reset();
  }

  async salvarEdicaoProduto(produtoId: number): Promise<void> {
    const venda = this.vendaSelecionada();
    if (!venda) return;

    try {
      this.editando.set(true);
      const formValue = this.produtoEditandoForm.value;
      
      const primeiroProdutoId = venda.produtos[0]?.id;
      if (!primeiroProdutoId) {
        this.toastService.error('ID da venda não encontrado');
        return;
      }

      const response = await firstValueFrom(
        this.apiService.put(`/admin/venda/${primeiroProdutoId}/produto/${produtoId}`, {
          quantidade: formValue.quantidade,
          precoUnitario: formValue.precoUnitario
        })
      );

      if (!response.success) {
        throw new Error(response.message || 'Erro ao atualizar produto');
      }

      // Atualizar localmente
      const produtosAtualizados = venda.produtos.map(p => {
        if (p.id === produtoId) {
          return {
            ...p,
            quantidade: formValue.quantidade,
            precoUnitario: formValue.precoUnitario
          };
        }
        return p;
      });

      // Recalcular valor total
      const novoValorTotal = produtosAtualizados.reduce((acc, p) => acc + (p.precoUnitario * p.quantidade), 0);

      const vendaAtualizada = {
        ...venda,
        produtos: produtosAtualizados,
        valorTotal: novoValorTotal
      };
      
      this.vendaSelecionada.set(vendaAtualizada);
      
      // Atualizar na lista também
      const vendas = this.vendas();
      const index = vendas.findIndex(v => v.vendaId === venda.vendaId);
      if (index !== -1) {
        vendas[index] = vendaAtualizada;
        this.vendas.set([...vendas]);
      }

      this.toastService.success('Produto atualizado com sucesso!');
      this.produtoEditando.set(null);
      this.produtoEditandoForm.reset();
    } catch (error: any) {
      console.error('Erro ao salvar edição do produto:', error);
      this.toastService.error(error?.error?.message || error?.message || 'Erro ao atualizar produto');
    } finally {
      this.editando.set(false);
    }
  }

  abrirModalConfirmacaoDeletarProduto(produtoId: number): void {
    this.produtoParaDeletar.set(produtoId);
    this.modalConfirmacaoDeletarProduto.set(true);
  }

  fecharModalConfirmacaoDeletarProduto(): void {
    this.modalConfirmacaoDeletarProduto.set(false);
    this.produtoParaDeletar.set(null);
  }

  async confirmarDeletarProduto(): Promise<void> {
    const venda = this.vendaSelecionada();
    const produtoId = this.produtoParaDeletar();
    if (!venda || !produtoId) return;

    try {
      this.deletandoProduto.set(true);
      
      const primeiroProdutoId = venda.produtos[0]?.id;
      if (!primeiroProdutoId) {
        this.toastService.error('ID da venda não encontrado');
        return;
      }

      const response = await firstValueFrom(
        this.apiService.delete(`/admin/venda/${primeiroProdutoId}/produto/${produtoId}`)
      );

      if (!response.success) {
        throw new Error(response.message || 'Erro ao deletar produto');
      }

      // Atualizar localmente
      const produtosFiltrados = venda.produtos.filter(p => p.id !== produtoId);
      
      // Se não sobrar nenhum produto, deletar a venda inteira
      if (produtosFiltrados.length === 0) {
        const vendas = this.vendas();
        const vendasFiltradas = vendas.filter(v => v.vendaId !== venda.vendaId);
        this.vendas.set(vendasFiltradas);
        this.totalVendas.set(this.totalVendas() - 1);
        this.toastService.success('Venda deletada (sem produtos restantes)');
        this.fecharModalConfirmacaoDeletarProduto();
        this.fecharDetalhes();
        return;
      }

      // Recalcular valor total
      const novoValorTotal = produtosFiltrados.reduce((acc, p) => acc + (p.precoUnitario * p.quantidade), 0);

      const vendaAtualizada = {
        ...venda,
        produtos: produtosFiltrados,
        valorTotal: novoValorTotal
      };
      
      this.vendaSelecionada.set(vendaAtualizada);
      
      // Atualizar na lista também
      const vendas = this.vendas();
      const index = vendas.findIndex(v => v.vendaId === venda.vendaId);
      if (index !== -1) {
        vendas[index] = vendaAtualizada;
        this.vendas.set([...vendas]);
      }

      this.toastService.success('Produto deletado com sucesso!');
      this.fecharModalConfirmacaoDeletarProduto();
    } catch (error: any) {
      console.error('Erro ao deletar produto:', error);
      this.toastService.error(error?.error?.message || error?.message || 'Erro ao deletar produto');
    } finally {
      this.deletandoProduto.set(false);
    }
  }

  async exportarHistorico(): Promise<void> {
    try {
      this.exportando.set(true);
      
      // Buscar todas as vendas (sem paginação)
      const formValue = this.filtrosForm.value;
      const params: any = {
        pagina: 1,
        limite: 10000, // Buscar todas
        ordenacao: formValue.ordenacao || 'data'
      };

      if (formValue.cliente) {
        params.cliente = formValue.cliente;
      }
      if (formValue.imeiCodigo) {
        params.imeiCodigo = formValue.imeiCodigo;
      }
      if (formValue.dataInicio) {
        params.dataInicio = formValue.dataInicio;
      }
      if (formValue.dataFim) {
        params.dataFim = formValue.dataFim;
      }

      const response = await firstValueFrom(
        this.apiService.get<HistoricoVenda[]>('/admin/historico', params)
      );

      if (!response.success || !response.data) {
        this.toastService.error('Erro ao exportar histórico');
        return;
      }

      // Preparar dados para exportação
      const dadosExport: any[] = [];
      response.data.forEach(venda => {
        venda.produtos.forEach((produto, index) => {
          dadosExport.push({
            'ID Venda': venda.vendaId,
            'Cliente': venda.clienteNome,
            'Telefone': venda.telefone,
            'Endereço': venda.endereco,
            'Produto': produto.produtoNome,
            'Quantidade': produto.quantidade,
            'Preço Unitário': produto.precoUnitario,
            'Subtotal': produto.precoUnitario * produto.quantidade,
            'Valor Total Venda': index === 0 ? venda.valorTotal : '',
            'Forma Pagamento': venda.formaPagamento,
            'Valor PIX': venda.valorPix || '',
            'Valor Cartão': venda.valorCartao || '',
            'Valor Dinheiro': venda.valorDinheiro || '',
            'Vendedor': venda.vendedorNome,
            'Email Vendedor': venda.vendedorEmail,
            'Data': this.formatDate(venda.createdAt),
            'Observações': venda.observacoes || ''
          });
        });
      });

      // Criar workbook e worksheet
      const ws = XLSX.utils.json_to_sheet(dadosExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Histórico de Vendas');

      // Gerar nome do arquivo
      const dataAtual = new Date().toISOString().split('T')[0];
      const nomeArquivo = `historico-vendas-${dataAtual}.xlsx`;

      // Salvar arquivo
      XLSX.writeFile(wb, nomeArquivo);
      
      this.toastService.success('Histórico exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar:', error);
      this.toastService.error('Erro ao exportar histórico');
    } finally {
      this.exportando.set(false);
    }
  }

  calcularTotalProdutos(venda: HistoricoVenda): number {
    return venda.produtos.reduce((acc, p) => acc + p.quantidade, 0);
  }

  // Usar funções do formatters compartilhado diretamente no template
  formatCurrency = formatCurrency;
  formatPhone = formatPhone;

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

  getTipoClienteNome(tipo: string | null | undefined): string {
    if (!tipo) return 'Não informado';
    const tipos: { [key: string]: string } = {
      'pf': 'Pessoa Física',
      'pj': 'Pessoa Jurídica',
      'revenda': 'Revenda'
    };
    return tipos[tipo] || tipo;
  }
}

