import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ProdutoComprado } from '../../shared/types/produto.types';
import { PanelModalComponent, PanelMenuItem } from '../../shared/components/panel-modal/panel-modal.component';
import { formatCurrency as formatCurrencyUtil, formatNumber as formatNumberUtil, formatDateOnly } from '../../shared/utils/formatters';

@Component({
  selector: 'app-listar-produtos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PanelModalComponent],
  templateUrl: './listar-produtos.component.html'
})
export class ListarProdutosComponent implements OnInit, OnDestroy {
  private apiService = inject(ApiService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();

  loading = signal<boolean>(true);
  loadingSilencioso = signal<boolean>(false);
  produtos = signal<ProdutoComprado[]>([]);
  paginaAtual = signal<number>(1);
  totalPaginas = signal<number>(1);
  totalProdutos = signal<number>(0);
  itensPorPagina = 10;

  filtrosForm: FormGroup;
  formularioEdicao: FormGroup;
  formularioPrecificacao: FormGroup;
  formularioDistribuicao: FormGroup;
  private debounceTimeout?: any;
  private primeiraCarga = true;

  // Modais
  modalEdicao = signal<boolean>(false);
  modalPrecificacao = signal<boolean>(false);
  modalDistribuicao = signal<boolean>(false);
  modalDeletar = signal<boolean>(false);
  modalDetalhes = signal<boolean>(false);
  produtoSelecionado = signal<ProdutoComprado | null>(null);
  salvandoEdicao = signal<boolean>(false);
  salvandoPrecificacao = signal<boolean>(false);
  salvandoDistribuicao = signal<boolean>(false);
  deletando = signal<boolean>(false);
  atendentes = signal<any[]>([]);

  // Panel Modal (Gerenciar Produto)
  modalGerenciar = signal<boolean>(false);
  selectedGerenciarItem = signal('editar');
  
  gerenciarMenuItems: PanelMenuItem[] = [
    { id: 'editar', label: 'Editar Produto', icon: 'edit' },
    { id: 'precificacao', label: 'Precificação', icon: 'attach_money' },
    { id: 'distribuir', label: 'Distribuir', icon: 'people' }
  ];

  constructor() {
    this.filtrosForm = this.fb.group({
      busca: [''],
      dataInicio: [''],
      dataFim: [''],
      ocultarEstoqueZerado: [false]
    });

    this.formularioEdicao = this.fb.group({
      nome: ['', Validators.required],
      descricao: [''],
      cor: [''],
      imei: [''],
      codigoBarras: [''],
      custoDolar: ['', Validators.required],
      taxaDolar: ['', Validators.required],
      preco: ['', Validators.required],
      quantidade: ['', [Validators.required, Validators.min(0)]],
      dataCompra: ['', Validators.required]
    });

    this.formularioPrecificacao = this.fb.group({
      valorAtacado: [''],
      valorVarejo: [''],
      valorRevendaEspecial: [''],
      valorParcelado10x: ['']
    });

    this.formularioDistribuicao = this.fb.group({
      atendenteId: ['', Validators.required],
      quantidade: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Carregar produtos na primeira vez
    this.carregarProdutos().then(() => {
      this.primeiraCarga = false;
      // Configurar listeners dos filtros após a primeira carga
      this.configurarListeners();
    });
  }

  private configurarListeners(): void {
    // Debounce na busca
    this.filtrosForm.get('busca')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((valor: string) => {
        if (this.primeiraCarga) return;
        
        if (this.debounceTimeout) {
          clearTimeout(this.debounceTimeout);
        }
        this.debounceTimeout = setTimeout(() => {
          this.paginaAtual.set(1);
          this.carregarProdutos(true);
        }, 500);
      });

    // Recarregar quando outros filtros mudarem
    this.filtrosForm.get('dataInicio')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.primeiraCarga) return;
        this.paginaAtual.set(1);
        this.carregarProdutos(true);
      });
    
    this.filtrosForm.get('dataFim')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.primeiraCarga) return;
        this.paginaAtual.set(1);
        this.carregarProdutos(true);
      });
    
    // Para ocultarEstoqueZerado, usar o valor do evento diretamente
    this.filtrosForm.get('ocultarEstoqueZerado')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((valor: boolean) => {
        if (this.primeiraCarga) return;
        
        this.paginaAtual.set(1);
        // Usar queueMicrotask para garantir que o valor do formulário foi atualizado
        queueMicrotask(() => {
          this.carregarProdutos(true);
        });
      });
  }

  ngOnDestroy(): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  async carregarProdutos(silencioso = false): Promise<void> {
    try {
      if (silencioso) {
        this.loadingSilencioso.set(true);
      } else {
        this.loading.set(true);
        this.produtos.set([]);
      }

      const formValue = this.filtrosForm.value;
      const params: any = {
        pagina: this.paginaAtual(),
        limite: this.itensPorPagina
      };

      if (formValue.busca?.trim()) {
        params.busca = formValue.busca.trim();
      }
      if (formValue.dataInicio) {
        params.dataInicio = formValue.dataInicio;
      }
      if (formValue.dataFim) {
        params.dataFim = formValue.dataFim;
      }
      // Se o checkbox estiver marcado (true), ocultar estoques zerados
      if (formValue.ocultarEstoqueZerado === true) {
        params.ocultarEstoqueZerado = true;
      }

      const response = await firstValueFrom(
        this.apiService.get<any[]>('/admin/produtos', params)
      );

      if (response?.success) {
        // Se response.data for um array vazio, ainda é sucesso (apenas não há resultados)
        const produtosData = response.data || [];
        const produtosFormatados = produtosData.map((produto: any) => ({
          ...produto,
          custoDolar: typeof produto.custoDolar === 'string' ? parseFloat(produto.custoDolar) : (produto.custoDolar || 0),
          taxaDolar: typeof produto.taxaDolar === 'string' ? parseFloat(produto.taxaDolar) : (produto.taxaDolar || 0),
          preco: typeof produto.preco === 'string' ? parseFloat(produto.preco) : (produto.preco || 0)
        }));
        this.produtos.set(produtosFormatados);
        this.totalPaginas.set(response.paginacao?.totalPaginas || 1);
        this.totalProdutos.set(response.paginacao?.total || 0);
      } else {
        this.toastService.error(response?.message || 'Erro ao carregar produtos');
        this.produtos.set([]);
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      this.toastService.error('Erro de conexão. Tente novamente.');
      this.produtos.set([]);
    } finally {
      if (silencioso) {
        this.loadingSilencioso.set(false);
      } else {
        this.loading.set(false);
      }
    }
  }

  limparFiltros(): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    this.filtrosForm.patchValue({
      busca: '',
      dataInicio: '',
      dataFim: '',
      ocultarEstoqueZerado: false
    });
    this.paginaAtual.set(1);
    this.carregarProdutos();
  }

  mudarPagina(pagina: number): void {
    this.paginaAtual.set(pagina);
    this.carregarProdutos(true);
  }

  // Usar funções do formatters compartilhado diretamente no template
  formatCurrency = formatCurrencyUtil;
  formatNumber = formatNumberUtil;
  formatDate = formatDateOnly;

  formatTaxaDolar(value: number): string {
    // Formata taxa do dólar com ponto ao invés de vírgula
    if (value === 0) return '0';
    // Usa formatação americana (ponto) e remove zeros desnecessários
    return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 }).replace(/\.?0+$/, '');
  }

  getPaginasParaMostrar(): (number | string)[] {
    const total = this.totalPaginas();
    const atual = this.paginaAtual();
    const maxVisiveis = 7;
    const paginas: (number | string)[] = [];

    if (total <= maxVisiveis) {
      for (let i = 1; i <= total; i++) {
        paginas.push(i);
      }
    } else {
      paginas.push(1);
      
      if (atual <= 4) {
        for (let i = 2; i <= 5; i++) {
          paginas.push(i);
        }
        paginas.push('...');
        paginas.push(total);
      } else if (atual >= total - 3) {
        paginas.push('...');
        for (let i = total - 4; i <= total; i++) {
          paginas.push(i);
        }
      } else {
        paginas.push('...');
        for (let i = atual - 1; i <= atual + 1; i++) {
          paginas.push(i);
        }
        paginas.push('...');
        paginas.push(total);
      }
    }

    return paginas;
  }

  getRangeTexto(): string {
    const inicio = ((this.paginaAtual() - 1) * this.itensPorPagina) + 1;
    const fim = Math.min(this.paginaAtual() * this.itensPorPagina, this.totalProdutos());
    return `Mostrando ${inicio} a ${fim} de ${this.totalProdutos()} produtos`;
  }

  calcularEstoqueTotal(produto: ProdutoComprado): number {
    if (!produto.estoque || produto.estoque.length === 0) {
      return produto.quantidade || 0;
    }
    return produto.estoque.reduce((total, item) => total + item.quantidade, 0);
  }

  // Métodos do Panel Modal (Gerenciar Produto)
  abrirModalDetalhes(produto: ProdutoComprado): void {
    this.produtoSelecionado.set(produto);
    this.modalDetalhes.set(true);
  }

  fecharModalDetalhes(): void {
    this.modalDetalhes.set(false);
    this.produtoSelecionado.set(null);
  }

  async abrirModalGerenciar(produto: ProdutoComprado): Promise<void> {
    this.produtoSelecionado.set(produto);
    this.selectedGerenciarItem.set('editar');
    
    // Atualizar menu items com estado disabled baseado no estoque
    this.gerenciarMenuItems = [
      { id: 'editar', label: 'Editar Produto', icon: 'edit' },
      { id: 'precificacao', label: 'Precificação', icon: 'attach_money' },
      { id: 'distribuir', label: 'Distribuir', icon: 'people', disabled: produto.quantidade <= 0 }
    ];
    
    // Carregar lista de atendentes para distribuição
    try {
      const response = await firstValueFrom(
        this.apiService.get<any[]>('/admin/atendentes')
      );
      if (response?.success && response.data) {
        this.atendentes.set(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar atendentes:', error);
    }
    
    // Preencher formulário de edição
    this.formularioEdicao.patchValue({
      nome: produto.nome,
      descricao: produto.descricao || '',
      cor: produto.cor || '',
      imei: produto.imei || '',
      codigoBarras: produto.codigoBarras || '',
      custoDolar: produto.custoDolar?.toString() || '',
      taxaDolar: produto.taxaDolar?.toString() || '',
      preco: produto.preco?.toString() || '',
      quantidade: produto.quantidade?.toString() || '',
      dataCompra: produto.dataCompra ? new Date(produto.dataCompra).toISOString().split('T')[0] : ''
    });
    
    // Preencher formulário de precificação
    this.formularioPrecificacao.patchValue({
      valorAtacado: produto.valorAtacado?.toString().replace('.', ',') || '',
      valorVarejo: produto.valorVarejo?.toString().replace('.', ',') || '',
      valorRevendaEspecial: produto.valorRevendaEspecial?.toString().replace('.', ',') || '',
      valorParcelado10x: produto.valorParcelado10x?.toString().replace('.', ',') || ''
    });
    
    // Resetar formulário de distribuição
    const quantidadeMaxima = produto.quantidade;
    this.formularioDistribuicao.reset({
      atendenteId: '',
      quantidade: ''
    });
    
    // Atualizar validação de quantidade máxima
    this.formularioDistribuicao.get('quantidade')?.setValidators([
      Validators.required,
      Validators.min(1),
      Validators.max(quantidadeMaxima)
    ]);
    this.formularioDistribuicao.get('quantidade')?.updateValueAndValidity();
    
    this.modalGerenciar.set(true);
  }

  fecharModalGerenciar(): void {
    this.modalGerenciar.set(false);
    this.produtoSelecionado.set(null);
    this.formularioEdicao.reset();
    this.formularioPrecificacao.reset();
  }

  onGerenciarMenuItemSelected(itemId: string): void {
    this.selectedGerenciarItem.set(itemId);
  }

  // Métodos de Edição
  abrirModalEdicao(produto: ProdutoComprado): void {
    this.produtoSelecionado.set(produto);
    this.formularioEdicao.patchValue({
      nome: produto.nome,
      descricao: produto.descricao || '',
      cor: produto.cor || '',
      imei: produto.imei || '',
      codigoBarras: produto.codigoBarras || '',
      custoDolar: produto.custoDolar?.toString() || '',
      taxaDolar: produto.taxaDolar?.toString() || '',
      preco: produto.preco?.toString() || '',
      quantidade: produto.quantidade?.toString() || '',
      dataCompra: produto.dataCompra ? new Date(produto.dataCompra).toISOString().split('T')[0] : ''
    });
    this.modalEdicao.set(true);
  }

  fecharModalEdicao(): void {
    this.modalEdicao.set(false);
    this.produtoSelecionado.set(null);
    this.formularioEdicao.reset();
  }

  async salvarEdicao(): Promise<void> {
    const produto = this.produtoSelecionado();
    if (!produto || this.formularioEdicao.invalid) return;

    try {
      this.salvandoEdicao.set(true);
      
      const formValue = this.formularioEdicao.value;
      const dadosAtualizacao: any = {};
      
      if (formValue.nome?.trim()) {
        dadosAtualizacao.nome = formValue.nome.trim();
      }
      if (formValue.descricao !== undefined) {
        dadosAtualizacao.descricao = formValue.descricao.trim() || null;
      }
      if (formValue.cor !== undefined) {
        dadosAtualizacao.cor = formValue.cor.trim() || null;
      }
      if (formValue.imei !== undefined) {
        dadosAtualizacao.imei = formValue.imei.trim() || null;
      }
      if (formValue.codigoBarras !== undefined) {
        dadosAtualizacao.codigoBarras = formValue.codigoBarras.trim() || null;
      }
      if (formValue.dataCompra?.trim()) {
        dadosAtualizacao.dataCompra = formValue.dataCompra.trim();
      }
      if (formValue.custoDolar !== undefined && formValue.custoDolar !== null && formValue.custoDolar !== '') {
        dadosAtualizacao.custoDolar = typeof formValue.custoDolar === 'string' 
          ? formValue.custoDolar.trim() 
          : formValue.custoDolar.toString();
      }
      if (formValue.taxaDolar !== undefined && formValue.taxaDolar !== null && formValue.taxaDolar !== '') {
        dadosAtualizacao.taxaDolar = typeof formValue.taxaDolar === 'string' 
          ? formValue.taxaDolar.trim() 
          : formValue.taxaDolar.toString();
      }
      if (formValue.preco !== undefined && formValue.preco !== null && formValue.preco !== '') {
        dadosAtualizacao.preco = typeof formValue.preco === 'string' 
          ? formValue.preco.trim() 
          : formValue.preco.toString();
      }
      if (formValue.quantidade !== undefined && formValue.quantidade !== null && formValue.quantidade !== '') {
        // quantidade é um número, não precisa de trim
        dadosAtualizacao.quantidade = formValue.quantidade.toString();
      }

      const response = await firstValueFrom(
        this.apiService.put<any>(`/admin/produtos/${produto.id}`, dadosAtualizacao)
      );

      if (response?.success) {
        this.toastService.success('Produto atualizado com sucesso!');
        this.fecharModalEdicao();
        this.fecharModalGerenciar();
        
        // Buscar produto atualizado
        try {
          const produtoAtualizadoResponse = await firstValueFrom(
            this.apiService.get<any>(`/admin/produtos/${produto.id}`)
          );
          if (produtoAtualizadoResponse?.success && produtoAtualizadoResponse.data) {
            // Atualizar produto na lista
            const produtosAtual = this.produtos();
            const index = produtosAtual.findIndex(p => p.id === produto.id);
            if (index !== -1) {
              const produtoFormatado = {
                ...produtoAtualizadoResponse.data,
                custoDolar: typeof produtoAtualizadoResponse.data.custoDolar === 'string' 
                  ? parseFloat(produtoAtualizadoResponse.data.custoDolar) 
                  : (produtoAtualizadoResponse.data.custoDolar || 0),
                taxaDolar: typeof produtoAtualizadoResponse.data.taxaDolar === 'string' 
                  ? parseFloat(produtoAtualizadoResponse.data.taxaDolar) 
                  : (produtoAtualizadoResponse.data.taxaDolar || 0),
                preco: typeof produtoAtualizadoResponse.data.preco === 'string' 
                  ? parseFloat(produtoAtualizadoResponse.data.preco) 
                  : (produtoAtualizadoResponse.data.preco || 0)
              };
              produtosAtual[index] = produtoFormatado;
              this.produtos.set([...produtosAtual]);
            }
          } else {
            // Recarregar lista
            this.carregarProdutos(true);
          }
        } catch (error) {
          console.error('Erro ao buscar produto atualizado:', error);
          this.carregarProdutos(true);
        }
      } else {
        this.toastService.error(response?.message || 'Erro ao salvar as alterações');
      }
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
      this.toastService.error('Erro de conexão. Tente novamente.');
    } finally {
      this.salvandoEdicao.set(false);
    }
  }

  // Métodos de Precificação
  abrirModalPrecificacao(produto: ProdutoComprado): void {
    this.produtoSelecionado.set(produto);
    this.formularioPrecificacao.patchValue({
      valorAtacado: produto.valorAtacado?.toString().replace('.', ',') || '',
      valorVarejo: produto.valorVarejo?.toString().replace('.', ',') || '',
      valorRevendaEspecial: produto.valorRevendaEspecial?.toString().replace('.', ',') || '',
      valorParcelado10x: produto.valorParcelado10x?.toString().replace('.', ',') || ''
    });
    this.modalPrecificacao.set(true);
  }

  fecharModalPrecificacao(): void {
    this.modalPrecificacao.set(false);
    this.produtoSelecionado.set(null);
    this.formularioPrecificacao.reset();
  }

  parseNumber(value: string): number {
    if (!value) return 0;
    return parseFloat(value.replace(',', '.')) || 0;
  }

  async salvarPrecificacao(): Promise<void> {
    const produto = this.produtoSelecionado();
    if (!produto) return;

    try {
      this.salvandoPrecificacao.set(true);
      
      const formValue = this.formularioPrecificacao.value;
      const dadosPrecificacao: any = {};
      
      if (formValue.valorAtacado?.trim()) {
        dadosPrecificacao.valorAtacado = this.parseNumber(formValue.valorAtacado);
      }
      if (formValue.valorVarejo?.trim()) {
        dadosPrecificacao.valorVarejo = this.parseNumber(formValue.valorVarejo);
      }
      if (formValue.valorRevendaEspecial?.trim()) {
        dadosPrecificacao.valorRevendaEspecial = this.parseNumber(formValue.valorRevendaEspecial);
      }
      if (formValue.valorParcelado10x?.trim()) {
        dadosPrecificacao.valorParcelado10x = this.parseNumber(formValue.valorParcelado10x);
      }

      const response = await firstValueFrom(
        this.apiService.put<any>(`/admin/produtos/${produto.id}/precificacao`, dadosPrecificacao)
      );

      if (response?.success) {
        this.toastService.success('Precificação atualizada com sucesso!');
        this.fecharModalPrecificacao();
        this.fecharModalGerenciar();
        
        // Buscar produto atualizado
        try {
          const produtoAtualizadoResponse = await firstValueFrom(
            this.apiService.get<any>(`/admin/produtos/${produto.id}`)
          );
          if (produtoAtualizadoResponse?.success && produtoAtualizadoResponse.data) {
            // Atualizar produto na lista
            const produtosAtual = this.produtos();
            const index = produtosAtual.findIndex(p => p.id === produto.id);
            if (index !== -1) {
              produtosAtual[index] = {
                ...produtosAtual[index],
                ...produtoAtualizadoResponse.data
              };
              this.produtos.set([...produtosAtual]);
            }
          } else {
            this.carregarProdutos(true);
          }
        } catch (error) {
          console.error('Erro ao buscar produto atualizado:', error);
          this.carregarProdutos(true);
        }
      } else {
        this.toastService.error(response?.message || 'Erro ao salvar precificação');
      }
    } catch (error) {
      console.error('Erro ao salvar precificação:', error);
      this.toastService.error('Erro de conexão. Tente novamente.');
    } finally {
      this.salvandoPrecificacao.set(false);
    }
  }

  // Métodos de Deletar
  abrirModalDeletar(produto: ProdutoComprado): void {
    this.produtoSelecionado.set(produto);
    this.modalDeletar.set(true);
  }

  fecharModalDeletar(): void {
    this.modalDeletar.set(false);
    this.produtoSelecionado.set(null);
  }

  async confirmarDeletar(): Promise<void> {
    const produto = this.produtoSelecionado();
    if (!produto) return;

    try {
      this.deletando.set(true);
      
      const response = await firstValueFrom(
        this.apiService.delete<any>(`/admin/produtos/${produto.id}`)
      );

      if (response?.success) {
        this.toastService.success('Produto deletado com sucesso!');
        this.fecharModalDeletar();
        
        // Remover produto da lista
        const produtosAtual = this.produtos();
        const produtosFiltrados = produtosAtual.filter(p => p.id !== produto.id);
        this.produtos.set(produtosFiltrados);
        this.totalProdutos.set(this.totalProdutos() - 1);
        
        // Se a página ficou vazia e não é a primeira, voltar uma página
        if (produtosFiltrados.length === 0 && this.paginaAtual() > 1) {
          this.paginaAtual.set(this.paginaAtual() - 1);
          this.carregarProdutos(true);
        }
      } else {
        this.toastService.error(response?.message || 'Erro ao deletar produto');
      }
    } catch (error: any) {
      console.error('Erro ao deletar produto:', error);
      const errorMessage = error?.error?.message || 'Erro de conexão. Tente novamente.';
      this.toastService.error(errorMessage);
    } finally {
      this.deletando.set(false);
    }
  }

  // Métodos de Distribuição
  async abrirModalDistribuicao(produto: ProdutoComprado): Promise<void> {
    this.produtoSelecionado.set(produto);
    
    // Carregar lista de atendentes
    try {
      const response = await firstValueFrom(
        this.apiService.get<any[]>('/admin/atendentes')
      );
      if (response?.success && response.data) {
        this.atendentes.set(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar atendentes:', error);
      this.toastService.error('Erro ao carregar lista de atendentes');
    }
    
    // Resetar formulário com validação de quantidade máxima
    const quantidadeMaxima = produto.quantidade;
    this.formularioDistribuicao.reset({
      atendenteId: '',
      quantidade: ''
    });
    
    // Atualizar validação de quantidade máxima
    this.formularioDistribuicao.get('quantidade')?.setValidators([
      Validators.required,
      Validators.min(1),
      Validators.max(quantidadeMaxima)
    ]);
    this.formularioDistribuicao.get('quantidade')?.updateValueAndValidity();
    
    this.modalDistribuicao.set(true);
  }

  fecharModalDistribuicao(): void {
    this.modalDistribuicao.set(false);
    this.produtoSelecionado.set(null);
    this.formularioDistribuicao.reset({
      atendenteId: '',
      quantidade: ''
    });
  }

  async salvarDistribuicao(): Promise<void> {
    const produto = this.produtoSelecionado();
    if (!produto) {
      this.toastService.error('Produto não encontrado');
      return;
    }
    
    if (!this.formularioDistribuicao.valid) {
      if (this.formularioDistribuicao.get('quantidade')?.hasError('max')) {
        this.toastService.error(`A quantidade não pode ser maior que ${produto.quantidade} unidades disponíveis`);
      } else if (this.formularioDistribuicao.get('quantidade')?.hasError('min')) {
        this.toastService.error('A quantidade deve ser pelo menos 1 unidade');
      } else {
        this.toastService.error('Preencha todos os campos corretamente');
      }
      return;
    }

    try {
      this.salvandoDistribuicao.set(true);
      
      const formValue = this.formularioDistribuicao.value;
      const quantidade = parseInt(formValue.quantidade);
      
      // Validação adicional
      if (!produto) {
        this.toastService.error('Produto não encontrado');
        this.salvandoDistribuicao.set(false);
        return;
      }
      
      if (quantidade > produto.quantidade) {
        this.toastService.error(`A quantidade solicitada (${quantidade}) excede a quantidade disponível (${produto.quantidade})`);
        this.salvandoDistribuicao.set(false);
        return;
      }
      
      if (quantidade <= 0) {
        this.toastService.error('A quantidade deve ser maior que zero');
        this.salvandoDistribuicao.set(false);
        return;
      }
      
      const dadosDistribuicao = {
        produtoId: produto.id,
        atendenteId: parseInt(formValue.atendenteId),
        quantidade: quantidade
      };

      const response = await firstValueFrom(
        this.apiService.post<any>('/admin/distribuir', dadosDistribuicao)
      );

      if (response?.success) {
        const atendenteNome = response.data?.atendente || 'Atendente';
        this.toastService.success(
          `Produto distribuído com sucesso! ${produto.nome} - Quantidade: ${formValue.quantidade} - Para: ${atendenteNome}`
        );
        this.fecharModalDistribuicao();
        this.fecharModalGerenciar();
        
        // Buscar produto atualizado
        try {
          const produtoAtualizadoResponse = await firstValueFrom(
            this.apiService.get<any>(`/admin/produtos/${produto.id}`)
          );
          if (produtoAtualizadoResponse?.success && produtoAtualizadoResponse.data) {
            // Atualizar produto na lista
            const produtosAtual = this.produtos();
            const index = produtosAtual.findIndex(p => p.id === produto.id);
            if (index !== -1) {
              const produtoFormatado = {
                ...produtoAtualizadoResponse.data,
                custoDolar: typeof produtoAtualizadoResponse.data.custoDolar === 'string' 
                  ? parseFloat(produtoAtualizadoResponse.data.custoDolar) 
                  : (produtoAtualizadoResponse.data.custoDolar || 0),
                taxaDolar: typeof produtoAtualizadoResponse.data.taxaDolar === 'string' 
                  ? parseFloat(produtoAtualizadoResponse.data.taxaDolar) 
                  : (produtoAtualizadoResponse.data.taxaDolar || 0),
                preco: typeof produtoAtualizadoResponse.data.preco === 'string' 
                  ? parseFloat(produtoAtualizadoResponse.data.preco) 
                  : (produtoAtualizadoResponse.data.preco || 0)
              };
              produtosAtual[index] = produtoFormatado;
              this.produtos.set([...produtosAtual]);
            }
          } else {
            this.carregarProdutos(true);
          }
        } catch (error) {
          console.error('Erro ao buscar produto atualizado:', error);
          this.carregarProdutos(true);
        }
      } else {
        this.toastService.error(response?.message || 'Erro ao distribuir produto');
      }
    } catch (error: any) {
      console.error('Erro ao distribuir produto:', error);
      const errorMessage = error?.error?.message || 'Erro de conexão. Tente novamente.';
      this.toastService.error(errorMessage);
    } finally {
      this.salvandoDistribuicao.set(false);
    }
  }
}
