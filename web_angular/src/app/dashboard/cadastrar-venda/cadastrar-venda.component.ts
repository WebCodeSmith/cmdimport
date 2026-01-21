import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { Produto } from '../../shared/types/produto.types';
import { formatCurrency } from '../../shared/utils/formatters';

import { ProdutoSearchSelectorComponent } from '../../shared/components/produto-search-selector/produto-search-selector.component';
import { ItemPrecificacao } from '../../shared/types/precificacao.types';

@Component({
  selector: 'app-cadastrar-venda',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ProdutoSearchSelectorComponent],
  templateUrl: './cadastrar-venda.component.html'
})
export class CadastrarVendaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private apiService = inject(ApiService);
  private toastService = inject(ToastService);

  user = this.authService.user;
  loading = signal<boolean>(false);
  loadingProdutos = signal<boolean>(true);
  produtos = signal<Produto[]>([]);
  tipoCliente = signal<'lojista' | 'consumidor' | 'revendaEspecial'>('lojista');
  mostrarFormasMistas = signal<boolean>(false);
  fotoPreview = signal<string | null>(null);
  uploadingFoto = signal<boolean>(false);

  precificacoesMap = signal<Map<string, ItemPrecificacao>>(new Map());

  vendaForm: FormGroup;
  produtosFormArray: FormArray;

  // Valor total reativo
  valorTotal = signal<number>(0);

  constructor() {
    this.vendaForm = this.fb.group({
      clienteNome: ['', [Validators.required]],
      telefone: ['', [Validators.required]],
      endereco: ['', [Validators.required]],
      observacoes: [''],
      formaPagamento: ['dinheiro', [Validators.required]],
      valorPix: [''],
      valorCartao: [''],
      valorDinheiro: [''],
      fotoProduto: ['']
    });

    this.produtosFormArray = this.fb.array([
      this.fb.group({
        produto: ['', [Validators.required]],
        quantidade: ['', [Validators.required, Validators.min(1)]],
        precoPersonalizado: [''],
        usarPrecoPersonalizado: [false]
      })
    ]);

    this.vendaForm.addControl('produtos', this.produtosFormArray);
  }

  ngOnInit(): void {
    this.carregarProdutos();
    this.carregarPrecificacoes();

    // Recalcular total sempre que o formulário mudar
    this.vendaForm.valueChanges.subscribe(() => {
      this.recalcularTotal();
    });
  }

  async carregarPrecificacoes(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.apiService.get<ItemPrecificacao[]>('/admin/precificacao')
      );
      if (response?.success && response.data) {
        const map = new Map<string, ItemPrecificacao>();
        response.data.forEach(p => map.set(p.nomeProduto, p));
        this.precificacoesMap.set(map);
        this.recalcularTotal(); // Recalcular após carregar preços
      }
    } catch (error) {
      console.error('Erro ao carregar precificações', error);
    }
  }

  recalcularTotal(): void {
    let total = 0;
    this.produtosFormArray.controls.forEach((control, index) => {
      const produto = this.getProdutoSelecionado(index);
      if (produto) {
        const quantidade = parseInt(control.get('quantidade')?.value || '0');
        const usarPrecoPersonalizado = control.get('usarPrecoPersonalizado')?.value;
        const precoPersonalizado = control.get('precoPersonalizado')?.value;

        let preco: number;
        if (usarPrecoPersonalizado && precoPersonalizado) {
          const precoStr = String(precoPersonalizado).replace(/[^\d,]/g, '').replace(',', '.');
          preco = parseFloat(precoStr) || 0;
        } else {
          preco = this.calcularPreco(produto);
        }

        total += preco * quantidade;
      }
    });
    this.valorTotal.set(total);
  }

  private async carregarProdutos(): Promise<void> {
    const user = this.user();
    if (!user) return;

    try {
      this.loadingProdutos.set(true);
      const response = await firstValueFrom(
        this.apiService.get<any[]>('/estoque', { usuarioId: user.id })
      );

      if (response?.success && response.data) {
        const produtosFormatados: Produto[] = response.data.map((item: any) => ({
          id: item.id.toString(),
          nome: item.nome,
          preco: item.preco || 0,
          quantidade: item.quantidade || 0,
          fornecedor: item.fornecedor ?? null,
          imei: item.imei,
          codigoBarras: item.codigoBarras,
          cor: item.cor,
          descricao: item.descricao
        })).filter(p => p.quantidade > 0).sort((a, b) => a.nome.localeCompare(b.nome));
        this.produtos.set(produtosFormatados);
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      this.toastService.error('Erro ao carregar produtos do estoque');
    } finally {
      this.loadingProdutos.set(false);
    }
  }

  get produtosControls() {
    return (this.vendaForm.get('produtos') as FormArray).controls as FormGroup[];
  }

  getProdutoControl(index: number): FormGroup {
    return this.produtosFormArray.at(index) as FormGroup;
  }

  getProdutoFormControl(index: number, controlName: string): FormControl {
    return this.getProdutoControl(index).get(controlName) as FormControl;
  }

  adicionarProduto(): void {
    this.produtosFormArray.insert(0,
      this.fb.group({
        produto: ['', [Validators.required]],
        quantidade: ['', [Validators.required, Validators.min(1)]],
        precoPersonalizado: [''],
        usarPrecoPersonalizado: [false]
      })
    );
  }

  removerProduto(index: number): void {
    if (this.produtosFormArray.length > 1) {
      this.produtosFormArray.removeAt(index);
    }
  }

  getProdutoSelecionado(index: number): Produto | undefined {
    const produtoId = this.produtosFormArray.at(index).get('produto')?.value;
    return this.produtos().find(p => p.id === produtoId);
  }

  calcularPreco(produto: Produto): number {
    // Usar precificação centralizada se disponível
    const map = this.precificacoesMap();
    const precificacao = map.get(produto.nome);
    const formaPagamento = this.vendaForm.get('formaPagamento')?.value;

    if (precificacao) {
      switch (formaPagamento) {
        case 'dinheiro':
        case 'pix':
          return precificacao.valorDinheiroPix || produto.preco;
        case 'debito':
          return precificacao.valorDebito || produto.preco;
        case 'credito_vista':
          return precificacao.valorCartaoVista || produto.preco;
        case 'credito_5x':
          return precificacao.valorCredito5x || produto.preco;
        case 'credito_10x':
          return precificacao.valorCredito10x || produto.preco;
        case 'credito_12x':
          return precificacao.valorCredito12x || produto.preco;
        // Fallback para tipos novos
        case 'pix_cartao':
          // Misturado é complexo. Vamos usar o preço base (dinheiro/pix) ou uma média?
          // Geralmente misto implica negociação. Vamos retornar o de dinheiro como base.
          return precificacao.valorDinheiroPix || produto.preco;
        default:
          // Se for 'cartao' genérico (legado), tentamos débito ou vista
          if (formaPagamento === 'cartao') return precificacao.valorCartaoVista || produto.preco;
          return precificacao.valorDinheiroPix || produto.preco;
      }
    }
    // Fallback para o preço base do produto se não houver precificação centralizada
    return produto.preco || 0;
  }

  onProdutoSelecionado(index: number, produtoId: string): void {
    const produto = this.produtos().find(p => p.id === produtoId);
    if (produto) {
      const preco = this.calcularPreco(produto);
      const control = this.produtosFormArray.at(index);
      control.patchValue({
        produto: produtoId,
        nome: produto.nome
      });
    }
  }

  // Removido - agora usa computed signal valorTotal

  formatCurrency(value: number): string {
    return formatCurrency(value);
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const numbers = input.value.replace(/\D/g, '');
    let formatted = '';

    if (numbers.length <= 10) {
      formatted = numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else if (numbers.length <= 11) {
      formatted = numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else {
      formatted = numbers.slice(0, 11).replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }

    this.vendaForm.patchValue({ telefone: formatted }, { emitEvent: false });
  }

  async handleFotoChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      this.toastService.error('Tipo de arquivo não permitido. Use apenas PNG ou JPG.');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.toastService.error('Arquivo muito grande. Tamanho máximo: 5MB');
      return;
    }

    this.uploadingFoto.set(true);

    try {
      const formData = new FormData();
      formData.append('foto', file);

      // Simular upload - você precisará implementar o endpoint de upload
      // Por enquanto, vamos usar uma URL temporária
      const reader = new FileReader();
      reader.onload = (e) => {
        this.fotoPreview.set(e.target?.result as string);
        this.vendaForm.patchValue({ fotoProduto: e.target?.result });
        this.toastService.success('Foto carregada com sucesso!');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      this.toastService.error('Erro ao fazer upload da foto');
    } finally {
      this.uploadingFoto.set(false);
    }
  }

  removerFoto(): void {
    this.fotoPreview.set(null);
    this.vendaForm.patchValue({ fotoProduto: '' });
  }

  getPrecoUnitario(index: number): number {
    const control = this.produtosFormArray.at(index) as FormGroup;
    const produto = this.getProdutoSelecionado(index);
    if (!produto) return 0;

    const usarPrecoPersonalizado = control.get('usarPrecoPersonalizado')?.value;
    const precoPersonalizado = control.get('precoPersonalizado')?.value;

    if (usarPrecoPersonalizado && precoPersonalizado) {
      const precoStr = String(precoPersonalizado).replace(/[^\d,]/g, '').replace(',', '.');
      return parseFloat(precoStr) || 0;
    }
    return this.calcularPreco(produto);
  }

  getSubtotal(index: number): number {
    const control = this.produtosFormArray.at(index) as FormGroup;
    const quantidade = parseInt(control.get('quantidade')?.value || '0');
    return this.getPrecoUnitario(index) * quantidade;
  }

  async onSubmit(): Promise<void> {
    if (this.vendaForm.invalid) {
      this.toastService.error('Preencha todos os campos obrigatórios');
      return;
    }

    const produtosValidos = this.produtosFormArray.controls
      .map((control, index) => {
        const produto = this.getProdutoSelecionado(index);
        const quantidade = control.get('quantidade')?.value;
        if (!produto || !quantidade) return null;

        const usarPrecoPersonalizado = control.get('usarPrecoPersonalizado')?.value || false;
        const precoPersonalizado = control.get('precoPersonalizado')?.value;

        return {
          produto: String(control.get('produto')?.value),
          nome: produto.nome,
          quantidade: String(quantidade), // Backend espera string
          usarPrecoPersonalizado: usarPrecoPersonalizado,
          precoPersonalizado: usarPrecoPersonalizado && precoPersonalizado
            ? String(precoPersonalizado)
            : null // Backend espera *string (ponteiro), então null em vez de undefined
        };
      })
      .filter(p => p !== null);

    if (produtosValidos.length === 0) {
      this.toastService.error('Selecione pelo menos um produto para a venda');
      return;
    }

    const user = this.user();
    if (!user) return;

    this.loading.set(true);

    try {
      const formValue = this.vendaForm.value;

      // Preparar payload conforme esperado pelo backend
      const venda: any = {
        clienteNome: formValue.clienteNome,
        telefone: formValue.telefone.replace(/\D/g, ''),
        endereco: formValue.endereco,
        produtos: produtosValidos,
        formaPagamento: formValue.formaPagamento || 'dinheiro',
        usuarioId: user.id,
        tipoCliente: this.tipoCliente() || null
      };

      // Campos opcionais - só adicionar se tiverem valor
      if (formValue.observacoes && formValue.observacoes.trim()) {
        venda.observacoes = formValue.observacoes.trim();
      }

      if (formValue.valorPix) {
        const valor = parseFloat(String(formValue.valorPix).replace(/[^\d,]/g, '').replace(',', '.'));
        if (!isNaN(valor) && valor > 0) {
          venda.valorPix = valor;
        }
      }

      if (formValue.valorCartao) {
        const valor = parseFloat(String(formValue.valorCartao).replace(/[^\d,]/g, '').replace(',', '.'));
        if (!isNaN(valor) && valor > 0) {
          venda.valorCartao = valor;
        }
      }

      if (formValue.valorDinheiro) {
        const valor = parseFloat(String(formValue.valorDinheiro).replace(/[^\d,]/g, '').replace(',', '.'));
        if (!isNaN(valor) && valor > 0) {
          venda.valorDinheiro = valor;
        }
      }

      if (formValue.fotoProduto && formValue.fotoProduto.trim()) {
        venda.fotoProduto = formValue.fotoProduto.trim();
      }

      const response = await firstValueFrom(
        this.apiService.post<any>('/vendas/cadastrar', venda)
      );

      if (response?.success) {
        const valorTotal = this.formatCurrency(this.valorTotal());
        const mensagem = `Venda cadastrada com sucesso!\nCliente: ${formValue.clienteNome}\nValor Total: ${valorTotal}`;

        // Toast de sucesso com duração maior (8 segundos)
        this.toastService.success(mensagem, { duration: 8000 });

        // Limpar formulário
        this.vendaForm.reset({
          formaPagamento: 'dinheiro'
        });
        this.produtosFormArray.clear();
        this.adicionarProduto();
        this.fotoPreview.set(null);
        this.tipoCliente.set('lojista');
      } else {
        this.toastService.error(response?.message || 'Erro ao cadastrar venda');
      }
    } catch (error: any) {
      console.error('Erro ao cadastrar venda:', error);

      // Extrair mensagem de erro do backend
      let errorMessage = 'Erro de conexão. Tente novamente.';
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      }

      this.toastService.error(errorMessage);
    } finally {
      this.loading.set(false);
    }
  }
}