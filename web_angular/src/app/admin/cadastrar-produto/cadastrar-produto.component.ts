import { Component, inject, signal, OnInit, effect, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ProdutoSugestao, CategoriaProduto, CriarCategoriaProdutoRequest } from '../../shared/types/produto.types';
import { formatCurrency, formatNumber as formatNumberUtil } from '../../shared/utils/formatters';

@Component({
  selector: 'app-cadastrar-produto',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cadastrar-produto.component.html'
})
export class CadastrarProdutoComponent implements OnInit {
  private apiService = inject(ApiService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);
  private elementRef = inject(ElementRef);

  loading = signal<boolean>(false);
  tipoIdentificacao = signal<'imei' | 'codigoBarras' | 'ambos'>('ambos');
  sugestoes = signal<ProdutoSugestao[]>([]);
  mostrarSugestoes = signal<boolean>(false);
  buscando = signal<boolean>(false);
  sugestaoSelecionada = signal<boolean>(false);

  // Categorias
  categorias = signal<CategoriaProduto[]>([]);
  modalNovaCategoria = signal<boolean>(false);
  salvandoCategoria = signal<boolean>(false);

  produtoForm: FormGroup;
  categoriaForm: FormGroup;
  precoCalculado = signal<string>('0,00');

  private debounceTimeout?: any;

  constructor() {
    this.produtoForm = this.fb.group({
      nome: ['', Validators.required],
      descricao: [''],
      cor: [''],
      imei: [''],
      codigoBarras: [''],
      custoDolar: ['', [Validators.required, Validators.min(0.01)]],
      taxaDolar: ['', [Validators.required, Validators.min(0.0001)]], // Campo inicia vazio
      quantidade: ['', [Validators.required, Validators.min(1)]],
      categoriaId: [''] // Opcional
    });

    this.categoriaForm = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(2)]],
      descricao: [''],
      icone: [''],
      cor: ['#4F46E5'] // Cor padrão indigo
    });

    // Calcular preço quando custo ou taxa mudarem
    this.produtoForm.get('custoDolar')?.valueChanges.subscribe(() => this.calcularPreco());
    this.produtoForm.get('taxaDolar')?.valueChanges.subscribe(() => this.calcularPreco());

    // Atualizar estado dos campos quando tipoIdentificacao mudar
    effect(() => {
      this.atualizarEstadoCampos(this.tipoIdentificacao());
    });
  }

  ngOnInit(): void {
    // Carregar categorias
    this.carregarCategorias();

    // Buscar produtos quando nome mudar (com debounce)
    this.produtoForm.get('nome')?.valueChanges.subscribe((valor: string) => {
      // Resetar flag quando usuário digitar
      this.sugestaoSelecionada.set(false);

      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout);
      }
      this.debounceTimeout = setTimeout(() => {
        if (valor && valor.length >= 2) {
          this.buscarProdutos(valor);
        } else {
          this.sugestoes.set([]);
          this.mostrarSugestoes.set(false);
        }
      }, 300);
    });
  }

  // Fechar dropdown ao clicar fora
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInside && this.mostrarSugestoes()) {
      this.mostrarSugestoes.set(false);
    }
  }

  private atualizarEstadoCampos(tipo: 'imei' | 'codigoBarras' | 'ambos'): void {
    const imeiControl = this.produtoForm.get('imei');
    const codigoBarrasControl = this.produtoForm.get('codigoBarras');

    if (tipo === 'imei') {
      imeiControl?.enable();
      codigoBarrasControl?.disable();
    } else if (tipo === 'codigoBarras') {
      imeiControl?.disable();
      codigoBarrasControl?.enable();
    } else {
      // Ambos - ambos habilitados
      imeiControl?.enable();
      codigoBarrasControl?.enable();
    }
  }

  calcularPreco(): void {
    const custo = this.parseNumber(this.produtoForm.get('custoDolar')?.value || '0');
    const taxa = this.parseNumber(this.produtoForm.get('taxaDolar')?.value || '0');
    const preco = custo * taxa;
    // Formata sempre com 2 casas decimais (formato brasileiro com vírgula)
    const precoFormatado = preco.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    this.precoCalculado.set(precoFormatado);
  }

  parseNumber(value: string): number {
    if (!value) return 0;
    return parseFloat(value.replace(',', '.')) || 0;
  }

  formatCurrencyInput(event: Event, controlName: string, maxDecimals: number = 2): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    // Se o campo estiver vazio, não processar
    if (!value || value.trim() === '') {
      this.produtoForm.get(controlName)?.setValue('', { emitEvent: false });
      if (controlName === 'custoDolar' || controlName === 'taxaDolar') {
        this.calcularPreco();
      }
      return;
    }

    // Remove tudo exceto números, vírgula e ponto
    value = value.replace(/[^\d,.]/g, '');

    // Se ficou vazio após limpeza, limpar o campo
    if (!value) {
      this.produtoForm.get(controlName)?.setValue('', { emitEvent: false });
      if (controlName === 'custoDolar' || controlName === 'taxaDolar') {
        this.calcularPreco();
      }
      return;
    }

    // Substitui ponto por vírgula (formato brasileiro)
    value = value.replace(/\./g, ',');

    // Garante apenas uma vírgula
    const parts = value.split(',');
    if (parts.length > 2) {
      value = parts[0] + ',' + parts.slice(1).join('');
    }

    // Limita casas decimais
    if (parts.length === 2 && parts[1].length > maxDecimals) {
      value = parts[0] + ',' + parts[1].substring(0, maxDecimals);
    }

    // Atualiza o valor do campo
    this.produtoForm.get(controlName)?.setValue(value, { emitEvent: false });

    // Recalcula o preço se necessário
    if (controlName === 'custoDolar' || controlName === 'taxaDolar') {
      this.calcularPreco();
    }
  }

  formatTaxaInput(event: Event): void {
    this.formatCurrencyInput(event, 'taxaDolar', 4);
  }

  formatCustoInput(event: Event): void {
    this.formatCurrencyInput(event, 'custoDolar', 2);
  }

  async buscarProdutos(termo: string): Promise<void> {
    if (termo.length < 2) {
      this.sugestoes.set([]);
      this.mostrarSugestoes.set(false);
      return;
    }

    try {
      this.buscando.set(true);
      const response = await firstValueFrom(
        this.apiService.get<any[]>('/admin/produtos', {
          pagina: 1,
          limite: 10,
          busca: termo
        })
      );

      if (response?.success && response.data) {
        const nomesUnicos = new Map<string, ProdutoSugestao>();
        response.data.forEach((produto: any) => {
          const nomeNormalizado = (produto.nome || '').trim().toLowerCase();
          if (nomeNormalizado && !nomesUnicos.has(nomeNormalizado)) {
            nomesUnicos.set(nomeNormalizado, {
              id: produto.id,
              nome: produto.nome.trim(),
              cor: produto.cor
            });
          }
        });
        this.sugestoes.set(Array.from(nomesUnicos.values()));
        this.mostrarSugestoes.set(true);
      } else {
        this.sugestoes.set([]);
        this.mostrarSugestoes.set(false);
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    } finally {
      this.buscando.set(false);
    }
  }

  selecionarSugestao(produto: ProdutoSugestao): void {
    // Usar emitEvent: false para não disparar valueChanges
    this.produtoForm.patchValue({ nome: produto.nome }, { emitEvent: false });
    this.sugestoes.set([]);
    this.mostrarSugestoes.set(false);
    this.sugestaoSelecionada.set(true); // Marcar que foi selecionado
  }

  async onSubmit(): Promise<void> {
    if (this.produtoForm.invalid) {
      this.toastService.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Validação para modo "ambos"
    if (this.tipoIdentificacao() === 'ambos') {
      const imei = this.produtoForm.get('imei')?.value?.trim();
      const codigoBarras = this.produtoForm.get('codigoBarras')?.value?.trim();
      if (!imei && !codigoBarras) {
        this.toastService.error('Por favor, preencha pelo menos um dos campos: IMEI ou Código de Barras');
        return;
      }
    }

    const formValue = this.produtoForm.value;
    const custoDolar = this.parseNumber(formValue.custoDolar);
    const taxaDolar = this.parseNumber(formValue.taxaDolar);
    const quantidade = parseInt(formValue.quantidade) || 0;

    if (custoDolar <= 0) {
      this.toastService.error('O custo em dólar deve ser maior que zero');
      return;
    }

    if (taxaDolar <= 0) {
      this.toastService.error('A taxa do dólar deve ser maior que zero');
      return;
    }

    if (quantidade <= 0) {
      this.toastService.error('A quantidade deve ser maior que zero');
      return;
    }

    this.loading.set(true);

    try {
      const dadosEnvio: any = {
        nome: formValue.nome.trim(),
        custoDolar,
        taxaDolar,
        quantidade,
        tipoIdentificacao: this.tipoIdentificacao()
      };

      if (formValue.descricao?.trim()) {
        dadosEnvio.descricao = formValue.descricao.trim();
      }

      if (formValue.cor?.trim()) {
        dadosEnvio.cor = formValue.cor.trim();
      }

      // IMEI e Código de Barras
      if (this.tipoIdentificacao() === 'imei') {
        if (!formValue.imei?.trim()) {
          this.toastService.error('O IMEI é obrigatório quando o tipo de identificação é IMEI');
          this.loading.set(false);
          return;
        }
        dadosEnvio.imei = formValue.imei.trim();
      } else if (this.tipoIdentificacao() === 'codigoBarras') {
        if (!formValue.codigoBarras?.trim()) {
          this.toastService.error('O Código de Barras é obrigatório quando o tipo de identificação é Código de Barras');
          this.loading.set(false);
          return;
        }
        dadosEnvio.codigoBarras = formValue.codigoBarras.trim();
      } else if (this.tipoIdentificacao() === 'ambos') {
        if (formValue.imei?.trim()) {
          dadosEnvio.imei = formValue.imei.trim();
        }
        if (formValue.codigoBarras?.trim()) {
          dadosEnvio.codigoBarras = formValue.codigoBarras.trim();
        }
      }

      // Categoria (converter string para número)
      if (formValue.categoriaId) {
        const categoriaId = parseInt(formValue.categoriaId, 10);
        if (!isNaN(categoriaId)) {
          dadosEnvio.categoriaId = categoriaId;
        }
      }

      const response = await firstValueFrom(
        this.apiService.post<any>('/admin/produtos/cadastrar', dadosEnvio)
      );

      if (response?.success && response.data) {
        const produto = response.data;
        const precoFormatado = formatCurrency(produto.preco);
        this.toastService.success(
          `Compra registrada com sucesso! Produto: ${produto.nome} - Preço: ${precoFormatado} - Quantidade: ${produto.quantidade} - Produto adicionado ao estoque!`
        );

        // Limpar formulário
        this.produtoForm.reset();
        this.precoCalculado.set('0,00');
        this.sugestoes.set([]);
        this.mostrarSugestoes.set(false);
        this.sugestaoSelecionada.set(false); // Resetar flag de seleção
      } else {
        this.toastService.error(response?.message || 'Erro ao cadastrar produto');
      }
    } catch (error) {
      console.error('Erro ao cadastrar produto:', error);
      this.toastService.error('Erro de conexão. Tente novamente.');
    } finally {
      this.loading.set(false);
    }
  }

  // ============================================
  // MÉTODOS DE CATEGORIAS
  // ============================================

  async carregarCategorias(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.apiService.get<CategoriaProduto[]>('/admin/categorias-produto')
      );
      if (response?.success && response.data) {
        // Filtrar apenas categorias ativas
        this.categorias.set(response.data.filter(c => c.ativo));
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  }

  abrirModalNovaCategoria(): void {
    this.categoriaForm.reset({
      cor: '#4F46E5' // Resetar com cor padrão
    });
    this.modalNovaCategoria.set(true);
  }

  fecharModalNovaCategoria(): void {
    this.modalNovaCategoria.set(false);
  }

  async salvarCategoria(): Promise<void> {
    if (this.categoriaForm.invalid) {
      this.toastService.error('Preencha o nome da categoria');
      return;
    }

    try {
      this.salvandoCategoria.set(true);
      const formValue = this.categoriaForm.value;

      const categoria: CriarCategoriaProdutoRequest = {
        nome: formValue.nome.trim(),
        descricao: formValue.descricao?.trim() || undefined,
        icone: formValue.icone?.trim() || undefined,
        cor: formValue.cor || undefined
      };

      const response = await firstValueFrom(
        this.apiService.post<CategoriaProduto>('/admin/categorias-produto', categoria)
      );

      if (response?.success && response.data) {
        this.toastService.success('Categoria criada com sucesso!');
        this.fecharModalNovaCategoria();
        await this.carregarCategorias();

        // Selecionar a categoria recém-criada no formulário
        this.produtoForm.patchValue({ categoriaId: response.data.id.toString() });
      } else {
        this.toastService.error(response?.message || 'Erro ao criar categoria');
      }
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      this.toastService.error('Erro ao criar categoria');
    } finally {
      this.salvandoCategoria.set(false);
    }
  }
}

