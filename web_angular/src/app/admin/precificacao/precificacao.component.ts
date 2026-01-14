import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { CategoriaDespesa, Despesa, CriarCategoriaDespesaRequest, CriarDespesaRequest } from '../../shared/types/despesa.types';
import { formatCurrency, formatDateOnly } from '../../shared/utils/formatters';
import { PanelModalComponent, PanelMenuItem } from '../../shared/components/panel-modal/panel-modal.component';

@Component({
  selector: 'app-precificacao',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, PanelModalComponent],
  templateUrl: './precificacao.component.html'
})
export class PrecificacaoComponent implements OnInit {
  private apiService = inject(ApiService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);

  loading = signal<boolean>(true);
  categorias = signal<CategoriaDespesa[]>([]);
  despesas = signal<Despesa[]>([]);
  categoriaSelecionada = signal<number | null>(null);
  semanaSelecionada = signal<number | null>(null); // null = todas as semanas

  // Calculadora de Custos
  abaAtiva = signal<'despesas' | 'calculadora'>('despesas');
  dataSelecionadaCalc = signal<string>('');
  produtosCalc = signal<any[]>([]);
  despesasCalc = signal<Despesa[]>([]);
  carregandoCalc = signal<boolean>(false);
  margemLucro = signal<number>(30); // Margem de lucro padrão: 30%
  tipoCliente = signal<'revenda' | 'consumidorFinal'>('consumidorFinal');

  // Modais
  modalNovaCategoria = signal<boolean>(false);
  modalNovaDespesa = signal<boolean>(false);
  modalGerenciarCategoria = signal<boolean>(false);
  categoriaEditando = signal<CategoriaDespesa | null>(null);
  modalEditarDespesa = signal<boolean>(false);
  despesaEditando = signal<Despesa | null>(null);

  // Formulários
  formularioCategoria: FormGroup;
  formularioEditarCategoria: FormGroup;
  formularioDespesa: FormGroup;
  formularioEditarDespesa: FormGroup;

  salvandoCategoria = signal<boolean>(false);
  salvandoEdicaoCategoria = signal<boolean>(false);
  salvandoDespesa = signal<boolean>(false);
  salvandoEdicao = signal<boolean>(false);
  deletandoDespesa = signal<boolean>(false);
  deletandoCategoria = signal<boolean>(false);

  // Panel Modal para gerenciar despesa
  modalGerenciarDespesa = signal<boolean>(false);
  selectedGerenciarItem = signal('editar');

  gerenciarMenuItems: PanelMenuItem[] = [
    { id: 'editar', label: 'Editar Despesa', icon: 'edit' },
    { id: 'deletar', label: 'Deletar Despesa', icon: 'delete' }
  ];

  // Panel Modal para gerenciar categoria
  selectedGerenciarCategoriaItem = signal('editar');

  gerenciarCategoriaMenuItems: PanelMenuItem[] = [
    { id: 'editar', label: 'Editar Categoria', icon: 'edit' },
    { id: 'deletar', label: 'Deletar Categoria', icon: 'delete' }
  ];

  despesasPorCategoria = computed(() => {
    const despesasArray = this.despesas();
    const categoriaId = this.categoriaSelecionada();

    if (!categoriaId) {
      return despesasArray;
    }

    return despesasArray.filter(d => d.categoriaId === categoriaId);
  });

  totalDespesas = computed(() => {
    return this.despesasPorCategoria().reduce((total, despesa) => total + despesa.valor, 0);
  });

  // Obter todas as semanas do mês atual
  obterSemanasDoMes(): number[] {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();

    // Primeiro e último dia do mês
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);

    // Calcular número de semanas
    const semanas = new Set<number>();
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      const data = new Date(ano, mes, dia);
      const semana = this.calcularSemanaDoMes(data.toISOString());
      semanas.add(semana);
    }

    return Array.from(semanas).sort((a, b) => a - b);
  }

  // Função para calcular a semana do mês baseado no calendário (Segunda a Domingo)
  calcularSemanaDoMes(dataString: string): number {
    const data = new Date(dataString);
    const ano = data.getFullYear();
    const mes = data.getMonth();
    const dia = data.getDate();

    // Primeiro dia do mês
    const primeiroDia = new Date(ano, mes, 1);
    let diaDaSemana = primeiroDia.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado

    // Ajustar para que segunda-feira seja 0, domingo seja 6
    diaDaSemana = diaDaSemana === 0 ? 6 : diaDaSemana - 1;

    // Calcular em qual semana o dia está
    const diasDesdeInicio = dia - 1;
    const diasAteCompletarPrimeiraSemana = diaDaSemana === 0 ? 0 : (7 - diaDaSemana);

    if (diasDesdeInicio < diasAteCompletarPrimeiraSemana) {
      return 1; // Primeira semana (parcial ou completa)
    }

    const diasAposPrimeiraSemana = diasDesdeInicio - diasAteCompletarPrimeiraSemana;
    return Math.floor(diasAposPrimeiraSemana / 7) + 2;
  }

  // Agrupar despesas por semana (dinâmico)
  despesasPorSemana = computed(() => {
    const despesasFiltradas = this.despesasPorCategoria();
    const semanas: { [key: number]: Despesa[] } = {};

    // Inicializar todas as semanas do mês
    this.obterSemanasDoMes().forEach(semana => {
      semanas[semana] = [];
    });

    despesasFiltradas.forEach(despesa => {
      const semana = this.calcularSemanaDoMes(despesa.data);
      if (!semanas[semana]) {
        semanas[semana] = [];
      }
      semanas[semana].push(despesa);
    });

    return semanas;
  });

  // Despesas filtradas por semana selecionada
  despesasFiltradasPorSemana = computed(() => {
    const semana = this.semanaSelecionada();
    if (!semana) {
      return this.despesasPorCategoria();
    }
    return this.despesasPorSemana()[semana] || [];
  });

  // Totais por semana (dinâmico)
  totalPorSemana = computed(() => {
    const semanas = this.despesasPorSemana();
    const totais: { [key: number]: number } = {};

    Object.keys(semanas).forEach(semanaStr => {
      const semana = Number(semanaStr);
      totais[semana] = semanas[semana].reduce((total, d) => total + d.valor, 0);
    });

    return totais;
  });

  // Função auxiliar para obter total de uma semana
  obterTotalSemana(semana: number | null): number {
    if (!semana) return 0;
    return this.totalPorSemana()[semana] || 0;
  }

  // Obter período da semana (ex: "01/01 - 04/01") - Segunda a Domingo
  obterPeriodoSemana(semana: number, mesAno?: string): string {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();

    // Primeiro dia do mês
    const primeiroDia = new Date(ano, mes, 1);
    let diaDaSemana = primeiroDia.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado

    // Ajustar para que segunda-feira seja 0, domingo seja 6
    diaDaSemana = diaDaSemana === 0 ? 6 : diaDaSemana - 1;

    let diaInicio: number, diaFim: number;

    if (semana === 1) {
      // Primeira semana: do dia 1 até o primeiro domingo
      diaInicio = 1;
      const diasAteCompletarPrimeiraSemana = diaDaSemana === 0 ? 6 : (7 - diaDaSemana - 1);
      diaFim = Math.min(diaInicio + diasAteCompletarPrimeiraSemana, new Date(ano, mes + 1, 0).getDate());
    } else {
      // Semanas seguintes: segunda a domingo
      const diasAteCompletarPrimeiraSemana = diaDaSemana === 0 ? 0 : (7 - diaDaSemana);
      diaInicio = diasAteCompletarPrimeiraSemana + ((semana - 2) * 7) + 1;
      diaFim = Math.min(diaInicio + 6, new Date(ano, mes + 1, 0).getDate());
    }

    const dataInicio = new Date(ano, mes, diaInicio);
    const dataFim = new Date(ano, mes, diaFim);

    return `${dataInicio.getDate().toString().padStart(2, '0')}/${(dataInicio.getMonth() + 1).toString().padStart(2, '0')} - ${dataFim.getDate().toString().padStart(2, '0')}/${(dataFim.getMonth() + 1).toString().padStart(2, '0')}`;
  }

  constructor() {
    this.formularioCategoria = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(2)]],
      descricao: ['']
    });

    this.formularioEditarCategoria = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(2)]],
      descricao: ['']
    });

    this.formularioDespesa = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(2)]],
      valor: ['', [Validators.required, Validators.min(0.01)]],
      categoriaId: ['', Validators.required],
      descricao: [''],
      data: [new Date().toISOString().split('T')[0], Validators.required]
    });

    this.formularioEditarDespesa = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(2)]],
      valor: ['', [Validators.required, Validators.min(0.01)]],
      categoriaId: ['', Validators.required],
      descricao: [''],
      data: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.carregarDados();
    this.configurarFormatacaoValor();
  }

  configurarFormatacaoValor(): void {
    // Formatação automática do valor no formulário de nova despesa
    this.formularioDespesa.get('valor')?.valueChanges.subscribe((valor: string) => {
      if (valor && typeof valor === 'string') {
        const apenasNumeros = valor.replace(/\D/g, '');
        if (apenasNumeros) {
          const valorFormatado = (parseInt(apenasNumeros) / 100).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
          const currentValue = this.formularioDespesa.get('valor')?.value;
          if (currentValue !== valorFormatado) {
            this.formularioDespesa.get('valor')?.setValue(valorFormatado, { emitEvent: false });
          }
        }
      }
    });

    // Formatação automática do valor no formulário de editar despesa
    this.formularioEditarDespesa.get('valor')?.valueChanges.subscribe((valor: string) => {
      if (valor && typeof valor === 'string') {
        const apenasNumeros = valor.replace(/\D/g, '');
        if (apenasNumeros) {
          const valorFormatado = (parseInt(apenasNumeros) / 100).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
          const currentValue = this.formularioEditarDespesa.get('valor')?.value;
          if (currentValue !== valorFormatado) {
            this.formularioEditarDespesa.get('valor')?.setValue(valorFormatado, { emitEvent: false });
          }
        }
      }
    });
  }

  async carregarDados(): Promise<void> {
    try {
      this.loading.set(true);
      await Promise.all([
        this.carregarCategorias(),
        this.carregarDespesas()
      ]);
    } finally {
      this.loading.set(false);
    }
  }

  async carregarCategorias(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.apiService.get<CategoriaDespesa[]>('/admin/categorias-despesa')
      );
      if (response?.success && response.data) {
        this.categorias.set(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      this.toastService.error('Erro ao carregar categorias');
    }
  }

  async carregarDespesas(): Promise<void> {
    try {
      const params: any = {};
      if (this.categoriaSelecionada()) {
        params.categoriaId = this.categoriaSelecionada();
      }

      const response = await firstValueFrom(
        this.apiService.get<Despesa[]>('/admin/despesas', params)
      );
      if (response?.success && response.data) {
        this.despesas.set(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar despesas:', error);
      this.toastService.error('Erro ao carregar despesas');
    }
  }

  selecionarCategoria(categoriaId: number | null): void {
    this.categoriaSelecionada.set(categoriaId);
    this.carregarDespesas();
  }

  selecionarSemana(semana: number | null): void {
    this.semanaSelecionada.set(semana);
  }

  abrirModalGerenciarCategoria(categoria: CategoriaDespesa): void {
    this.categoriaEditando.set(categoria);
    this.selectedGerenciarCategoriaItem.set('editar');
    this.modalGerenciarCategoria.set(true);

    // Preencher formulário de edição
    this.formularioEditarCategoria.patchValue({
      nome: categoria.nome,
      descricao: categoria.descricao || ''
    });
  }

  fecharModalGerenciarCategoria(): void {
    this.modalGerenciarCategoria.set(false);
    this.categoriaEditando.set(null);
  }

  onGerenciarCategoriaMenuItemSelected(itemId: string): void {
    this.selectedGerenciarCategoriaItem.set(itemId);

    if (itemId === 'deletar') {
      this.confirmarDeletarCategoria();
    }
  }

  async salvarEdicaoCategoria(): Promise<void> {
    if (this.formularioEditarCategoria.invalid || !this.categoriaEditando()) {
      this.toastService.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      this.salvandoEdicaoCategoria.set(true);
      const formValue = this.formularioEditarCategoria.value;
      const categoriaId = this.categoriaEditando()!.id;

      const response = await firstValueFrom(
        this.apiService.put<CategoriaDespesa>(`/admin/categorias-despesa/${categoriaId}`, {
          nome: formValue.nome.trim(),
          descricao: formValue.descricao?.trim() || undefined
        })
      );
      if (response?.success && response.data) {
        this.toastService.success('Categoria atualizada com sucesso!');
        this.fecharModalGerenciarCategoria();
        await this.carregarCategorias();
      } else {
        this.toastService.error(response?.message || 'Erro ao atualizar categoria');
      }
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      this.toastService.error('Erro ao atualizar categoria');
    } finally {
      this.salvandoEdicaoCategoria.set(false);
    }
  }

  async confirmarDeletarCategoria(): Promise<void> {
    if (!this.categoriaEditando()) return;

    try {
      this.deletandoCategoria.set(true);
      const categoriaId = this.categoriaEditando()!.id;

      const response = await firstValueFrom(
        this.apiService.delete(`/admin/categorias-despesa/${categoriaId}`)
      );
      if (response?.success) {
        this.toastService.success('Categoria deletada com sucesso!');
        if (this.categoriaSelecionada() === categoriaId) {
          this.categoriaSelecionada.set(null);
        }
        this.fecharModalGerenciarCategoria();
        await this.carregarDados();
      } else {
        this.toastService.error(response?.message || 'Erro ao deletar categoria');
      }
    } catch (error) {
      console.error('Erro ao deletar categoria:', error);
      this.toastService.error('Erro ao deletar categoria');
    } finally {
      this.deletandoCategoria.set(false);
    }
  }

  abrirModalNovaCategoria(): void {
    this.formularioCategoria.reset();
    this.modalNovaCategoria.set(true);
  }

  fecharModalNovaCategoria(): void {
    this.modalNovaCategoria.set(false);
  }

  async salvarCategoria(): Promise<void> {
    if (this.formularioCategoria.invalid) {
      this.toastService.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      this.salvandoCategoria.set(true);
      const formValue = this.formularioCategoria.value;

      const categoria: CriarCategoriaDespesaRequest = {
        nome: formValue.nome.trim(),
        descricao: formValue.descricao?.trim() || undefined
      };

      const response = await firstValueFrom(
        this.apiService.post<CategoriaDespesa>('/admin/categorias-despesa', categoria)
      );
      if (response?.success && response.data) {
        this.toastService.success('Categoria criada com sucesso!');
        this.fecharModalNovaCategoria();
        await this.carregarCategorias();
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

  abrirModalNovaDespesa(): void {
    // Obter data atual no formato YYYY-MM-DD sem problemas de timezone
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    const dataFormatada = `${ano}-${mes}-${dia}`;

    this.formularioDespesa.reset({
      data: dataFormatada,
      categoriaId: this.categoriaSelecionada() || ''
    });
    this.modalNovaDespesa.set(true);
  }

  fecharModalNovaDespesa(): void {
    this.modalNovaDespesa.set(false);
  }

  async salvarDespesa(): Promise<void> {
    if (this.formularioDespesa.invalid) {
      this.toastService.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      this.salvandoDespesa.set(true);
      const formValue = this.formularioDespesa.value;

      const valorNumerico = parseFloat(String(formValue.valor).replace(/[^\d,]/g, '').replace(',', '.'));

      // Garantir que a data esteja no formato correto YYYY-MM-DD
      let dataFormatada = formValue.data;
      if (!dataFormatada) {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        dataFormatada = `${ano}-${mes}-${dia}`;
      }

      const despesa: CriarDespesaRequest = {
        nome: formValue.nome.trim(),
        valor: valorNumerico,
        categoriaId: parseInt(formValue.categoriaId),
        descricao: formValue.descricao?.trim() || undefined,
        data: dataFormatada
      };

      const response = await firstValueFrom(
        this.apiService.post<Despesa>('/admin/despesas', despesa)
      );
      if (response?.success && response.data) {
        this.toastService.success('Despesa adicionada com sucesso!');
        this.fecharModalNovaDespesa();
        await this.carregarDespesas();
      } else {
        this.toastService.error(response?.message || 'Erro ao adicionar despesa');
      }
    } catch (error) {
      console.error('Erro ao salvar despesa:', error);
      this.toastService.error('Erro ao adicionar despesa');
    } finally {
      this.salvandoDespesa.set(false);
    }
  }

  abrirModalGerenciarDespesa(despesa: Despesa): void {
    this.despesaEditando.set(despesa);
    this.selectedGerenciarItem.set('editar');
    this.modalGerenciarDespesa.set(true);

    // Preencher formulário de edição
    this.formularioEditarDespesa.patchValue({
      nome: despesa.nome,
      valor: despesa.valor.toFixed(2).replace('.', ','),
      categoriaId: despesa.categoriaId,
      descricao: despesa.descricao || '',
      data: despesa.data
    });
  }

  fecharModalGerenciarDespesa(): void {
    this.modalGerenciarDespesa.set(false);
    this.despesaEditando.set(null);
  }

  onGerenciarMenuItemSelected(itemId: string): void {
    this.selectedGerenciarItem.set(itemId);

    if (itemId === 'deletar') {
      this.confirmarDeletarDespesa();
    }
  }

  async salvarEdicaoDespesa(): Promise<void> {
    if (this.formularioEditarDespesa.invalid || !this.despesaEditando()) {
      this.toastService.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      this.salvandoEdicao.set(true);
      const formValue = this.formularioEditarDespesa.value;
      const despesaId = this.despesaEditando()!.id;

      const valorNumerico = parseFloat(String(formValue.valor).replace(/[^\d,]/g, '').replace(',', '.'));
      const response = await firstValueFrom(
        this.apiService.put<Despesa>(`/admin/despesas/${despesaId}`, {
          nome: formValue.nome.trim(),
          valor: valorNumerico,
          categoriaId: parseInt(formValue.categoriaId),
          descricao: formValue.descricao?.trim() || undefined,
          data: formValue.data
        })
      );
      if (response?.success && response.data) {
        this.toastService.success('Despesa atualizada com sucesso!');
        this.fecharModalGerenciarDespesa();
        await this.carregarDespesas();
      } else {
        this.toastService.error(response?.message || 'Erro ao atualizar despesa');
      }
    } catch (error) {
      console.error('Erro ao atualizar despesa:', error);
      this.toastService.error('Erro ao atualizar despesa');
    } finally {
      this.salvandoEdicao.set(false);
    }
  }

  async confirmarDeletarDespesa(): Promise<void> {
    if (!this.despesaEditando()) return;

    try {
      this.deletandoDespesa.set(true);
      const despesaId = this.despesaEditando()!.id;

      const response = await firstValueFrom(
        this.apiService.delete(`/admin/despesas/${despesaId}`)
      );
      if (response?.success) {
        this.toastService.success('Despesa deletada com sucesso!');
        this.fecharModalGerenciarDespesa();
        await this.carregarDespesas();
      } else {
        this.toastService.error(response?.message || 'Erro ao deletar despesa');
      }
    } catch (error) {
      console.error('Erro ao deletar despesa:', error);
      this.toastService.error('Erro ao deletar despesa');
    } finally {
      this.deletandoDespesa.set(false);
    }
  }

  async deletarCategoria(categoriaId: number): Promise<void> {
    const categoria = this.categorias().find(c => c.id === categoriaId);
    if (!categoria) return;

    if (!confirm(`Tem certeza que deseja deletar a categoria "${categoria.nome}"? Todas as despesas desta categoria também serão deletadas.`)) {
      return;
    }

    try {
      this.deletandoCategoria.set(true);

      const response = await firstValueFrom(
        this.apiService.delete(`/admin/categorias-despesa/${categoriaId}`)
      );
      if (response?.success) {
        this.toastService.success('Categoria deletada com sucesso!');
        if (this.categoriaSelecionada() === categoriaId) {
          this.categoriaSelecionada.set(null);
        }
        await this.carregarDados();
      } else {
        this.toastService.error(response?.message || 'Erro ao deletar categoria');
      }
    } catch (error) {
      console.error('Erro ao deletar categoria:', error);
      this.toastService.error('Erro ao deletar categoria');
    } finally {
      this.deletandoCategoria.set(false);
    }
  }

  // ============================================
  // CALCULADORA DE CUSTOS POR DATA
  // ============================================

  mudarAba(aba: 'despesas' | 'calculadora'): void {
    this.abaAtiva.set(aba);

    // Se mudou para calculadora, define data de hoje como padrão
    if (aba === 'calculadora' && !this.dataSelecionadaCalc()) {
      const hoje = new Date();
      const ano = hoje.getFullYear();
      const mes = String(hoje.getMonth() + 1).padStart(2, '0');
      const dia = String(hoje.getDate()).padStart(2, '0');
      this.dataSelecionadaCalc.set(`${ano}-${mes}-${dia}`);
    }
  }

  async buscarCalculoPorData(): Promise<void> {
    const data = this.dataSelecionadaCalc();
    if (!data) {
      this.toastService.error('Selecione uma data');
      return;
    }

    try {
      this.carregandoCalc.set(true);

      // Buscar produtos cadastrados nesta data
      const responseProdutos = await firstValueFrom(
        this.apiService.get<any>('/admin/produtos', {
          dataInicio: data,
          dataFim: data,
          limite: 1000 // Pegar todos os produtos da data
        })
      );

      // Buscar despesas desta data
      const responseDespesas = await firstValueFrom(
        this.apiService.get<any>('/admin/despesas')
      );

      if (responseProdutos?.success && responseDespesas?.success) {
        const produtos = responseProdutos.data || [];
        const todasDespesas = responseDespesas.data || [];

        // Filtrar despesas da data selecionada
        const despesasDaData = todasDespesas.filter((d: Despesa) => {
          const despesaData = new Date(d.data).toISOString().split('T')[0];
          return despesaData === data;
        });

        this.produtosCalc.set(produtos);
        this.despesasCalc.set(despesasDaData);
      } else {
        this.toastService.error('Erro ao buscar dados');
      }
    } catch (error) {
      console.error('Erro ao buscar cálculo:', error);
      this.toastService.error('Erro ao buscar dados');
    } finally {
      this.carregandoCalc.set(false);
    }
  }

  totalDespesasCalc = computed(() => {
    return this.despesasCalc().reduce((total, despesa) => total + despesa.valor, 0);
  });

  quantidadeProdutosCalc = computed(() => {
    return this.produtosCalc().reduce((total, produto) => total + (produto.quantidade || 0), 0);
  });

  // Agrupar despesas por categoria
  despesasPorCategoriaCalc = computed(() => {
    const despesas = this.despesasCalc();
    const todasCategorias = this.categorias();
    const agrupado: { [categoriaId: number]: { categoria: CategoriaDespesa; total: number; despesas: Despesa[] } } = {};

    despesas.forEach(despesa => {
      if (!agrupado[despesa.categoriaId]) {
        // Buscar categoria da despesa ou da lista geral
        const categoria = despesa.categoria || todasCategorias.find(c => c.id === despesa.categoriaId);
        if (!categoria) return; // Skip se não encontrar categoria

        agrupado[despesa.categoriaId] = {
          categoria,
          total: 0,
          despesas: []
        };
      }
      agrupado[despesa.categoriaId].total += despesa.valor;
      agrupado[despesa.categoriaId].despesas.push(despesa);
    });

    return agrupado;
  });

  // Lista de categorias que têm despesas na data selecionada
  categoriasComDespesas = computed(() => {
    return Object.values(this.despesasPorCategoriaCalc());
  });

  // Identificar categoria de frete
  getCategoriaFreteId(): number | null {
    const categoriaFrete = this.categorias().find(c => {
      const nomeNormalizado = c.nome.toLowerCase();
      return nomeNormalizado.includes('frete') || nomeNormalizado.includes('custo frete');
    });
    return categoriaFrete?.id || null;
  }

  // Calcular custo adicional por categoria
  custoPorCategoriaPorProduto = computed(() => {
    const quantidade = this.quantidadeProdutosCalc();
    if (quantidade === 0) return {};

    const custoPorCategoria: { [categoriaId: number]: number } = {};
    const despesasAgrupadas = this.despesasPorCategoriaCalc();

    Object.entries(despesasAgrupadas).forEach(([categoriaId, dados]) => {
      custoPorCategoria[Number(categoriaId)] = dados.total / quantidade;
    });

    return custoPorCategoria;
  });

  produtosComCusto = computed(() => {
    const produtos = this.produtosCalc();
    const custoPorCategoria = this.custoPorCategoriaPorProduto();
    const margem = this.margemLucro() / 100;
    const tipoCliente = this.tipoCliente();
    const categoriaFreteId = this.getCategoriaFreteId();

    return produtos.map(produto => {
      const precoUnitario = produto.preco || 0;
      const quantidade = produto.quantidade || 0;

      // Filtrar categorias baseado no tipo de cliente
      let categoriasParaCalculo: { [categoriaId: number]: number } = {};

      if (tipoCliente === 'revenda' && categoriaFreteId) {
        // Modo Revenda: apenas frete
        if (custoPorCategoria[categoriaFreteId]) {
          categoriasParaCalculo[categoriaFreteId] = custoPorCategoria[categoriaFreteId];
        }
      } else if (tipoCliente === 'consumidorFinal') {
        // Modo Consumidor Final: todas as categorias
        categoriasParaCalculo = custoPorCategoria;
      }
      // Se revenda e não houver frete, categoriasParaCalculo fica vazio

      // Calcular custo adicional de cada categoria
      const custosPorCategoria: { [categoriaId: number]: number } = {};
      let custoAdicionalTotal = 0;

      Object.entries(categoriasParaCalculo).forEach(([categoriaId, custoUnitario]) => {
        const custoTotal = custoUnitario * quantidade;
        custosPorCategoria[Number(categoriaId)] = custoTotal;
        custoAdicionalTotal += custoTotal;
      });

      const custoFinal = precoUnitario + (custoAdicionalTotal / quantidade);
      const precoVendaSugerido = custoFinal * (1 + margem);
      const lucroUnitario = precoVendaSugerido - custoFinal;
      const lucroTotal = lucroUnitario * quantidade;

      return {
        ...produto,
        custosPorCategoria,
        custoAdicionalTotal,
        custoAdicionalUnitario: custoAdicionalTotal / quantidade,
        custoFinal,
        totalComCusto: custoFinal * quantidade,
        precoVendaSugerido,
        lucroUnitario,
        lucroTotal
      };
    });
  });

  lucroTotalEstimado = computed(() => {
    return this.produtosComCusto().reduce((total, produto) => total + produto.lucroTotal, 0);
  });

  // ============================================
  // FORMATAÇÃO E UTILIDADES
  // ============================================

  formatCurrency(value: number): string {
    return formatCurrency(value);
  }

  formatDate(dateString: string): string {
    return formatDateOnly(dateString);
  }

  getCategoriaNome(categoriaId: number): string {
    const categoria = this.categorias().find(c => c.id === categoriaId);
    return categoria?.nome || 'Sem categoria';
  }
}

