import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { EstoqueUsuario, ProdutoEstoqueCompleto } from '../../shared/types/estoque.types';
import { UsuarioEstoque } from '../../shared/types/user.types';
import { PanelModalComponent } from '../../shared/components/panel-modal/panel-modal.component';

@Component({
  selector: 'app-estoque-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PanelModalComponent],
  templateUrl: './estoque-usuarios.component.html'
})
export class EstoqueUsuariosComponent implements OnInit {
  private apiService = inject(ApiService);
  private toastService = inject(ToastService);
  private fb = inject(FormBuilder);

  loading = signal<boolean>(true);
  exportando = signal<boolean>(false);
  estoqueUsuarios = signal<EstoqueUsuario[]>([]);
  filtroUsuario = signal<string>('');
  filtroImeiCodigo = signal<string>('');
  mostrarEstoquesZerados = signal<boolean>(false);
  produtoExpandido = signal<number | null>(null);
  modalProdutosUsuario = signal<boolean>(false);
  usuarioSelecionado = signal<EstoqueUsuario | null>(null);
  
  // Modal de redistribuição
  modalRedistribuicao = signal<boolean>(false);
  produtoRedistribuir = signal<ProdutoEstoqueCompleto | null>(null);
  usuarioOrigem = signal<UsuarioEstoque | null>(null);
  usuariosDisponiveis = signal<UsuarioEstoque[]>([]);
  salvandoRedistribuicao = signal<boolean>(false);
  formularioRedistribuicao: FormGroup;
  
  // Modal de deletar
  modalDeletar = signal<boolean>(false);
  estoqueParaDeletar = signal<{ id: number; produtoNome: string; usuarioNome: string } | null>(null);
  deletando = signal<boolean>(false);

  constructor() {
    this.formularioRedistribuicao = this.fb.group({
      usuarioDestinoId: ['', Validators.required],
      quantidade: ['', [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    this.carregarEstoqueUsuarios();
  }

  async carregarEstoqueUsuarios(): Promise<void> {
    try {
      this.loading.set(true);
      const response = await firstValueFrom(
        this.apiService.get<EstoqueUsuario[]>('/admin/estoque-usuarios')
      );

      if (response?.success && response.data) {
        this.estoqueUsuarios.set(response.data);
      } else {
        this.toastService.error(response?.message || 'Erro ao carregar estoque dos usuários');
      }
    } catch (error) {
      console.error('Erro ao carregar estoque dos usuários:', error);
      this.toastService.error('Erro de conexão. Tente novamente.');
    } finally {
      this.loading.set(false);
    }
  }

  usuariosFiltrados = computed(() => {
    const usuarios = this.estoqueUsuarios();
    const filtroUsuario = this.filtroUsuario().toLowerCase();
    const filtroImeiCodigo = this.filtroImeiCodigo().toLowerCase();
    const mostrarZerados = this.mostrarEstoquesZerados();

    return usuarios
      .map(usuario => {
        // Filtro por nome/email
        const passaFiltroTexto = 
          usuario.nome.toLowerCase().includes(filtroUsuario) ||
          usuario.email.toLowerCase().includes(filtroUsuario);
        
        if (!passaFiltroTexto) {
          return null;
        }
        
        // Filtrar produtos
        let produtosFiltrados = mostrarZerados 
          ? usuario.produtos 
          : usuario.produtos.filter(produto => produto.quantidade > 0);
        
        // Aplicar filtro por IMEI/código de barras
        if (filtroImeiCodigo) {
          produtosFiltrados = produtosFiltrados.filter(produto => {
            const correspondeImei = produto.imei?.toLowerCase().includes(filtroImeiCodigo) || false;
            const correspondeCodigoBarras = produto.codigoBarras?.toLowerCase().includes(filtroImeiCodigo) || false;
            return correspondeImei || correspondeCodigoBarras;
          });
        }
        
        // Se não há produtos após o filtro, não mostrar o usuário
        if (produtosFiltrados.length === 0 && !mostrarZerados) {
          return null;
        }
        
        return {
          ...usuario,
          produtos: produtosFiltrados,
          totalProdutos: produtosFiltrados.length,
          totalQuantidade: produtosFiltrados.reduce((total, produto) => total + produto.quantidade, 0)
        };
      })
      .filter((usuario): usuario is EstoqueUsuario => usuario !== null);
  });

  resumoGeral = computed(() => {
    const usuarios = this.estoqueUsuarios();
    return {
      totalUsuarios: usuarios.length,
      valorTotal: usuarios.reduce((total, usuario) => {
        return total + usuario.produtos.reduce((produtoTotal, produto) => {
          return produtoTotal + (produto.quantidade * produto.preco);
        }, 0);
      }, 0),
      totalUnidades: usuarios.reduce((total, usuario) => total + usuario.totalQuantidade, 0)
    };
  });

  abrirModalProdutosUsuario(usuario: EstoqueUsuario): void {
    this.usuarioSelecionado.set(usuario);
    this.modalProdutosUsuario.set(true);
  }

  fecharModalProdutosUsuario(): void {
    this.modalProdutosUsuario.set(false);
    this.usuarioSelecionado.set(null);
  }

  toggleDescricao(produtoId: number): void {
    this.produtoExpandido.set(this.produtoExpandido() === produtoId ? null : produtoId);
  }

  async abrirModalRedistribuicao(produto: ProdutoEstoqueCompleto, usuario: EstoqueUsuario): Promise<void> {
    if (produto.quantidade <= 0) {
      this.toastService.error('Não é possível redistribuir produto sem estoque');
      return;
    }

    this.produtoRedistribuir.set(produto);
    this.usuarioOrigem.set({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      isAdmin: usuario.isAdmin
    });
    
    // Carregar lista de usuários disponíveis
    try {
      const response = await firstValueFrom(
        this.apiService.get<UsuarioEstoque[]>('/admin/usuarios')
      );
      
      if (response?.success && response.data) {
        const usuariosFiltrados = response.data.filter(u => u.id !== usuario.id);
        this.usuariosDisponiveis.set(usuariosFiltrados);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
    
    this.formularioRedistribuicao.reset();
    this.modalRedistribuicao.set(true);
  }

  fecharModalRedistribuicao(): void {
    this.modalRedistribuicao.set(false);
    this.produtoRedistribuir.set(null);
    this.usuarioOrigem.set(null);
    this.usuariosDisponiveis.set([]);
    this.formularioRedistribuicao.reset();
  }

  async salvarRedistribuicao(): Promise<void> {
    const produto = this.produtoRedistribuir();
    const usuarioOrigem = this.usuarioOrigem();
    
    if (!produto || !usuarioOrigem || this.formularioRedistribuicao.invalid) {
      this.toastService.error('Por favor, preencha todos os campos obrigatórios.');
      this.formularioRedistribuicao.markAllAsTouched();
      return;
    }

    try {
      this.salvandoRedistribuicao.set(true);
      const formValue = this.formularioRedistribuicao.value;
      
      const response = await firstValueFrom(
        this.apiService.post<any>('/admin/redistribuir', {
          produtoId: produto.id,
          usuarioOrigemId: usuarioOrigem.id,
          usuarioDestinoId: parseInt(formValue.usuarioDestinoId),
          quantidade: parseInt(formValue.quantidade)
        })
      );

      if (response?.success) {
        await this.carregarEstoqueUsuarios();
        
        // Atualizar o usuário selecionado no modal se estiver aberto
        const usuarioAtual = this.usuarioSelecionado();
        if (usuarioAtual) {
          const usuariosAtualizados = this.estoqueUsuarios();
          const usuarioAtualizado = usuariosAtualizados.find(u => u.id === usuarioAtual.id);
          if (usuarioAtualizado) {
            this.usuarioSelecionado.set(usuarioAtualizado);
          }
        }
        
        this.fecharModalRedistribuicao();
        this.toastService.success(
          `Produto redistribuído com sucesso! ${produto.nome} - Quantidade: ${formValue.quantidade}`
        );
      } else {
        this.toastService.error('Erro ao redistribuir produto: ' + (response?.message || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao redistribuir produto:', error);
      this.toastService.error('Erro de conexão. Tente novamente.');
    } finally {
      this.salvandoRedistribuicao.set(false);
    }
  }

  abrirModalDeletar(estoqueId: number, produtoNome: string, usuarioNome: string): void {
    this.estoqueParaDeletar.set({ id: estoqueId, produtoNome, usuarioNome });
    this.modalDeletar.set(true);
  }

  fecharModalDeletar(): void {
    this.modalDeletar.set(false);
    this.estoqueParaDeletar.set(null);
  }

  async confirmarDeletarEstoque(): Promise<void> {
    const estoque = this.estoqueParaDeletar();
    if (!estoque) return;

    try {
      this.deletando.set(true);
      const response = await firstValueFrom(
        this.apiService.delete<any>(`/admin/estoque-usuarios/${estoque.id}`)
      );

      if (response?.success) {
        this.toastService.success(
          `Estoque deletado com sucesso! ${estoque.produtoNome} - ${estoque.usuarioNome}`
        );
        
        // Atualizar estado local
        this.estoqueUsuarios.update(prev => {
          return prev.map(usuario => {
            const produtosAtualizados = usuario.produtos.filter(produto => produto.id !== estoque.id);
            return {
              ...usuario,
              produtos: produtosAtualizados,
              totalProdutos: produtosAtualizados.length,
              totalQuantidade: produtosAtualizados.reduce((total, produto) => total + produto.quantidade, 0)
            };
          });
        });
        
        // Atualizar o usuário selecionado no modal se estiver aberto
        const usuarioAtual = this.usuarioSelecionado();
        if (usuarioAtual) {
          const usuariosAtualizados = this.estoqueUsuarios();
          const usuarioAtualizado = usuariosAtualizados.find(u => u.id === usuarioAtual.id);
          if (usuarioAtualizado) {
            this.usuarioSelecionado.set(usuarioAtualizado);
          }
        }
        
        this.fecharModalDeletar();
      } else {
        this.toastService.error('Erro ao deletar estoque: ' + (response?.message || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao deletar estoque:', error);
      this.toastService.error('Erro de conexão. Tente novamente.');
    } finally {
      this.deletando.set(false);
    }
  }

  async exportarParaExcel(): Promise<void> {
    try {
      this.exportando.set(true);
      
      // Importar XLSX dinamicamente
      const XLSX = await import('xlsx');
      
      const linhasExcel: Array<Record<string, string | number>> = [];
      
      this.usuariosFiltrados().forEach((usuario) => {
        usuario.produtos.forEach((produto) => {
          let status = '';
          if (produto.quantidade === 0) {
            status = 'Zerado';
          } else if (produto.quantidade <= 2) {
            status = 'Crítico';
          } else {
            status = 'Em estoque';
          }

          linhasExcel.push({
            'ID Produto': produto.produtoCompradoId,
            'Vendedor': usuario.nome,
            'Produto': produto.nome,
            'Quantidade': produto.quantidade,
            'Status': status,
            'Preço': produto.preco,
            'Atacado': produto.valorAtacado || '',
            'Varejo': produto.valorVarejo || '',
            'Cor': produto.cor || '',
            'IMEI': produto.imei || '',
            'Código de Barras': produto.codigoBarras || '',
            'Descrição': produto.descricao || ''
          });
        });
      });

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(linhasExcel.length > 0 ? linhasExcel : [{}]);
      
      // Ajustar largura das colunas
      const headers = linhasExcel.length > 0 ? Object.keys(linhasExcel[0]) : [];
      const colWidths = headers.map((header: string) => {
        const maxLength = Math.max(
          header.length,
          ...linhasExcel.map((row: Record<string, string | number>) => {
            const value = row[header];
            return value ? String(value).length : 0;
          })
        );
        return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
      });
      
      worksheet['!cols'] = colWidths;
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Estoque Usuários');
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `estoque_usuarios_${new Date().toISOString().split('T')[0]}.xlsx`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.toastService.success('Arquivo Excel exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar:', error);
      this.toastService.error('Erro ao exportar dados. Tente novamente.');
    } finally {
      this.exportando.set(false);
    }
  }

  limparFiltros(): void {
    this.filtroUsuario.set('');
    this.filtroImeiCodigo.set('');
  }

  getStatus(quantidade: number): string {
    if (quantidade === 0) return 'Zerado';
    if (quantidade <= 2) return 'Crítico';
    return 'Em estoque';
  }

  getStatusClass(quantidade: number): string {
    if (quantidade === 0) return 'bg-red-100 text-red-800';
    if (quantidade <= 2) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  calcularValorTotalUsuario(produtos: ProdutoEstoqueCompleto[]): number {
    return produtos.reduce((total, produto) => total + (produto.quantidade * produto.preco), 0);
  }
}

