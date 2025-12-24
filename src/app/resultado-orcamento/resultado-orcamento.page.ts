import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OrcamentoService } from '../services/orcamento.service';
import { PlanoService } from '../services/plano.service';
import { OrcamentoDTO, ItemOrcamentoDTO } from '../models/orcamento.model';
import { LoadingController, ToastController, ModalController } from '@ionic/angular';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Assistente } from '../models/assistente.model';
import { ModalAdicionarAssistenteComponent } from './modal-adicionar-assistente.component';

interface OrcamentoComItens {
  orcamento: OrcamentoDTO;
  itens: ItemOrcamentoDTO[];
}

@Component({
  selector: 'app-resultado-orcamento',
  templateUrl: './resultado-orcamento.page.html',
  styleUrls: ['./resultado-orcamento.page.scss'],
  standalone: false,
})
export class ResultadoOrcamentoPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orcamentoService = inject(OrcamentoService);
  private planoService = inject(PlanoService);
  private loadingController = inject(LoadingController);
  private toastController = inject(ToastController);
  private modalController = inject(ModalController);

  // Signals para reatividade
  private _orcamentoData = signal<OrcamentoComItens | null>(null);
  private _isLoading = signal<boolean>(false);
  private _codigoHash = signal<string | null>(null);
  private _itensEditados = signal<ItemOrcamentoDTO[]>([]);
  private _itensIniciais = signal<ItemOrcamentoDTO[]>([]);

  // Computed signals
  readonly orcamento = computed(() => this._orcamentoData()?.orcamento);
  readonly itens = computed(() => {
    const itensEditados = this._itensEditados();
    return itensEditados.length > 0 ? itensEditados : (this._orcamentoData()?.itens || []);
  });
  readonly isLoading = computed(() => this._isLoading());
  readonly codigoHash = computed(() => this._codigoHash());

  // Agrupa itens por tipo
  readonly itensPorTipo = computed(() => {
    const itensLista = this.itens();
    return {
      ASSISTENTE: itensLista.filter(i => i.tipoItem === 'ASSISTENTE'),
      CANAL: itensLista.filter(i => i.tipoItem === 'CANAL'),
      INFRAESTRUTURA: itensLista.filter(i => i.tipoItem === 'INFRAESTRUTURA')
    };
  });

  // Detecta se há mudanças
  readonly temMudancas = computed(() => {
    const itensAtuais = this.itens();
    const itensIniciais = this._itensIniciais();
    
    if (itensAtuais.length !== itensIniciais.length) return true;
    
    // Compara cada item
    return itensAtuais.some(itemAtual => {
      const itemInicial = itensIniciais.find(i => 
        i.id === itemAtual.id || 
        (i.referenciaId === itemAtual.referenciaId && i.tipoItem === itemAtual.tipoItem)
      );
      return !itemInicial || itemInicial.quantidade !== itemAtual.quantidade;
    });
  });

  // Valores calculados
  readonly totalSetup = computed(() => {
    const itens = this.itens();
    return itens.reduce((sum, item) => sum + (item.totalSetupFechado || 0), 0);
  });

  // Valor total do orçamento recalculado dinamicamente
  readonly valorTotalFechado = computed(() => {
    const itens = this.itens();
    return itens.reduce((sum, item) => sum + (item.totalMensalFechado || 0), 0);
  });

  readonly linkCompartilhavel = computed(() => {
    const hash = this.codigoHash();
    if (!hash) return '';
    return `${window.location.origin}/resultado-orcamento?hash=${hash}`;
  });

  ngOnInit() {
    const hash = this.route.snapshot.queryParams['hash'];
    if (hash) {
      this._codigoHash.set(hash);
      this.carregarOrcamento();
    } 
    else {
      this.showToast('Hash do orçamento não encontrado.', 'danger');
      //this.router.navigate(['/wizard']);
    }
  }

  async carregarOrcamento() {
    const hash = this.codigoHash();
    if (!hash) return;

    this._isLoading.set(true);
    const loading = await this.loadingController.create({
      message: 'Carregando proposta...',
      spinner: 'crescent'
    });
    await loading.present();

    // Tenta buscar pelo endpoint customizado com hash
    this.orcamentoService.getByHashComItens(hash).subscribe({
      next: (data) => {
        loading.dismiss();
        this._isLoading.set(false);
        this._orcamentoData.set(data);
        // Salva uma cópia inicial dos itens para comparação de mudanças
        this._itensIniciais.set(JSON.parse(JSON.stringify(data.itens || [])));
        this._itensEditados.set([]); // Limpa itens editados ao carregar
      },
      error: (error) => {
        // Fallback: Se o endpoint customizado não existir, tenta buscar pelo hash normal
        // e depois buscar os itens separadamente
        if (error.status === 404) {
          this.orcamentoService.getByHash(hash).subscribe({
            next: (orcamento) => {
              // Se o orçamento tiver itens já carregados, usa eles
              if (orcamento.itens && orcamento.itens.length > 0) {
                loading.dismiss();
                this._isLoading.set(false);
                this._orcamentoData.set({ orcamento, itens: orcamento.itens });
                this._itensIniciais.set(JSON.parse(JSON.stringify(orcamento.itens)));
                this._itensEditados.set([]);
              } else {
                // Se não tiver itens, tenta buscar pelo ID
                if (orcamento.id) {
                  this.orcamentoService.getByIdComItens(orcamento.id).subscribe({
                    next: (data) => {
                      loading.dismiss();
                      this._isLoading.set(false);
                      this._orcamentoData.set(data);
                      this._itensIniciais.set(JSON.parse(JSON.stringify(data.itens || [])));
                      this._itensEditados.set([]);
                    },
                    error: (err) => {
                      loading.dismiss();
                      this._isLoading.set(false);
                      // Usa o orçamento sem itens como fallback
                      this._orcamentoData.set({ orcamento, itens: [] });
                      this._itensIniciais.set([]);
                      this._itensEditados.set([]);
                    }
                  });
                } else {
                  loading.dismiss();
                  this._isLoading.set(false);
                  this._orcamentoData.set({ orcamento, itens: [] });
                  this._itensIniciais.set([]);
                  this._itensEditados.set([]);
                }
              }
            },
            error: (err) => {
              loading.dismiss();
              this._isLoading.set(false);
              let errorMessage = 'Erro ao carregar proposta.';
              if (err.status === 404) {
                errorMessage = 'Proposta não encontrada.';
              } else if (err.error?.message) {
                errorMessage = err.error.message;
              }
              this.showToast(errorMessage, 'danger');
              //this.router.navigate(['/wizard']);
            }
          });
        } else {
          loading.dismiss();
          this._isLoading.set(false);
          let errorMessage = 'Erro ao carregar proposta.';
          if (error.error?.message) {
            errorMessage = error.error.message;
          }
          this.showToast(errorMessage, 'danger');
          //this.router.navigate(['/wizard']);
        }
      }
    });
  }

  async copiarLink() {
    const link = this.linkCompartilhavel();
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      this.showToast('Link copiado para a área de transferência!', 'success');
    } catch (error) {
      this.showToast('Erro ao copiar link.', 'danger');
    }
  }

  falarComConsultor() {
    const orcamento = this.orcamento();
    const hash = this.codigoHash();
    const nomeCliente = orcamento?.nomeCliente || orcamento?.nomeProspect || 'Cliente';
    
    const mensagem = encodeURIComponent(
      `Olá, gostaria de falar sobre o orçamento do ${nomeCliente} (Ref: ${hash})`
    );
    // TODO: Substituir pelo número real do WhatsApp
    window.open(`https://wa.me/5511999999999?text=${mensagem}`, '_blank');
  }

  aprovarEAtivar() {
    // TODO: Implementar lógica de aprovação
    this.showToast('Funcionalidade de aprovação em desenvolvimento.', 'warning');
  }

  editarProposta() {
    // Volta para o wizard com o hash para carregar e editar
    const hash = this.codigoHash();
    if (hash) {
      this.router.navigate(['/wizard'], { 
        queryParams: { hash, action: 'edit' } 
      });
    } else {
      this.showToast('Hash da proposta não encontrado.', 'warning');
    }
  }

  getIconeTipoItem(tipoItem: string): string {
    switch (tipoItem) {
      case 'INFRAESTRUTURA':
        return 'server-outline';
      case 'ASSISTENTE':
        return 'people-outline';
      case 'CANAL':
        return 'chatbubbles-outline';
      default:
        return 'cube-outline';
    }
  }

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  // Método auxiliar para recalcular valores de um item baseado na quantidade
  private recalcularValoresItem(item: ItemOrcamentoDTO): ItemOrcamentoDTO {
    const precoUnitarioFechado = item.precoUnitarioFechado || 0;
    const precoUnitarioTabela = item.precoUnitarioTabela || 0;
    
    // Recalcula total mensal baseado no preço unitário e quantidade
    const totalMensalFechado = precoUnitarioFechado * item.quantidade;
    
    // Para setup, geralmente é um valor fixo por item, não multiplicado pela quantidade
    // Mas se houver setup por unidade, pode ser necessário ajustar
    // Por enquanto, mantemos o setup proporcional à quantidade se já existir
    const setupUnitario = item.totalSetupFechado && item.quantidade > 0 
      ? item.totalSetupFechado / item.quantidade 
      : (item.totalSetupFechado || 0);
    const totalSetupFechado = setupUnitario * item.quantidade;

    return {
      ...item,
      totalMensalFechado,
      totalSetupFechado
    };
  }

  // Métodos de edição de itens
  removerItem(item: ItemOrcamentoDTO) {
    const itensAtuais = this.itens();
    const novosItens = itensAtuais.filter(i => 
      !(i.id === item.id && i.referenciaId === item.referenciaId && i.tipoItem === item.tipoItem)
    );
    this._itensEditados.set([...novosItens]);
    this.showToast('Item removido. Clique em "Salvar Alterações" para confirmar.', 'warning');
  }

  diminuirQuantidade(item: ItemOrcamentoDTO) {
    if (item.quantidade <= 1) {
      this.removerItem(item);
      return;
    }

    const itensAtuais = this.itens();
    const novosItens = itensAtuais.map(i => {
      if (i.id === item.id && i.referenciaId === item.referenciaId && i.tipoItem === item.tipoItem) {
        const itemAtualizado = { ...i, quantidade: i.quantidade - 1 };
        return this.recalcularValoresItem(itemAtualizado);
      }
      return i;
    });
    this._itensEditados.set([...novosItens]);
  }

  aumentarQuantidade(item: ItemOrcamentoDTO) {
    const itensAtuais = this.itens();
    const novosItens = itensAtuais.map(i => {
      if (i.id === item.id && i.referenciaId === item.referenciaId && i.tipoItem === item.tipoItem) {
        const itemAtualizado = { ...i, quantidade: i.quantidade + 1 };
        return this.recalcularValoresItem(itemAtualizado);
      }
      return i;
    });
    this._itensEditados.set([...novosItens]);
  }

  async abrirModalAdicionarAssistente() {
    // Extrai setores dos assistentes já no orçamento para filtrar assistentes disponíveis
    // TODO: Melhorar para buscar setores diretamente do orçamento quando disponível na API
    
    // Por enquanto, busca todos os assistentes disponíveis
    const modal = await this.modalController.create({
      component: ModalAdicionarAssistenteComponent,
      componentProps: {
        assistentesAtuais: this.itensPorTipo().ASSISTENTE.map(i => i.referenciaId),
        setorIds: [] // TODO: Extrair setores dos assistentes existentes
      }
    });

    await modal.present();
    const { data } = await modal.onWillDismiss();

    if (data && data.assistente) {
      this.adicionarAssistente(data.assistente, data.quantidade || 1);
    }
  }

  async adicionarAssistente(assistente: Assistente, quantidade: number = 1) {
    // Verifica se o assistente já existe
    const itensAtuais = this.itens();
    const assistenteExistente = itensAtuais.find(
      i => i.tipoItem === 'ASSISTENTE' && i.referenciaId === assistente.id
    );

    let novosItens: ItemOrcamentoDTO[];

    if (assistenteExistente) {
      // Se já existe, aumenta a quantidade e recalcula valores
      novosItens = itensAtuais.map(i => {
        if (i.tipoItem === 'ASSISTENTE' && i.referenciaId === assistente.id) {
          const itemAtualizado = { ...i, quantidade: i.quantidade + quantidade };
          return this.recalcularValoresItem(itemAtualizado);
        }
        return i;
      });
    } else {
      // Se não existe, adiciona novo item
      // TODO: Buscar preços reais da API
      const novoItem: ItemOrcamentoDTO = {
        tipoItem: 'ASSISTENTE',
        referenciaId: assistente.id,
        descricao: assistente.nome,
        quantidade: quantidade,
        precoUnitarioTabela: 0, // TODO: Buscar da API
        precoUnitarioFechado: 0, // TODO: Buscar da API
        totalMensalFechado: 0, // TODO: Calcular
        totalSetupFechado: 0
      };
      novosItens = [...itensAtuais, novoItem];
    }

    this._itensEditados.set([...novosItens]);
    this.showToast('Assistente adicionado. Clique em "Salvar Alterações" para confirmar.', 'success');
  }

  async salvarAlteracoes() {
    if (!this.temMudancas()) {
      this.showToast('Nenhuma alteração para salvar.', 'warning');
      return;
    }

    const orcamentoId = this.orcamento()?.id;
    if (!orcamentoId) {
      this.showToast('Erro: ID do orçamento não encontrado.', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Salvando alterações...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Usa os dados do orçamento que já estão carregados na página
      const orcamentoAtual = this.orcamento();
      if (!orcamentoAtual) {
        throw new Error('Orçamento não encontrado');
      }

      // Recalcula valores totais do orçamento baseado nos itens editados
      const itensAtualizados = this.itens();
      const valorTotalFechado = itensAtualizados.reduce(
        (sum, item) => sum + (item.totalMensalFechado || 0), 
        0
      );
      const valorTotalTabela = itensAtualizados.reduce(
        (sum, item) => sum + (item.precoUnitarioTabela * item.quantidade || 0), 
        0
      );

      // Atualiza os itens do orçamento e recalcula valores totais
      const orcamentoAtualizado: OrcamentoDTO = {
        ...orcamentoAtual,
        itens: itensAtualizados,
        valorTotalFechado,
        valorTotalTabela
      };

      // Atualiza na API usando PUT no endpoint customizado com itens
      console.log('🔄 Atualizando orçamento:', {
        id: orcamentoId,
        endpoint: `/api/custom/orcamentos/com-itens/${orcamentoId}`,
        payload: orcamentoAtualizado
      });

      const orcamentoAtualizadoResponse = await firstValueFrom(
        this.orcamentoService.update(orcamentoId, orcamentoAtualizado).pipe(
          catchError((error) => {
            console.error('❌ Erro ao atualizar orçamento:', error);
            throw error;
          })
        )
      );

      console.log('✅ Orçamento atualizado com sucesso:', orcamentoAtualizadoResponse);

      // Usa os itens editados (que já têm os valores recalculados corretos)
      // em vez dos itens da resposta da API, para manter os valores calculados
      const itensSalvos = itensAtualizados;
      
      // Atualiza os dados localmente com os itens que foram salvos (valores corretos)
      const currentData = this._orcamentoData();
      if (currentData) {
        this._orcamentoData.set({
          orcamento: {
            ...orcamentoAtualizadoResponse,
            valorTotalFechado,
            valorTotalTabela
          },
          itens: itensSalvos
        });
      }

      // Atualiza os itens iniciais com os valores salvos para que temMudancas() retorne false
      this._itensIniciais.set(JSON.parse(JSON.stringify(itensSalvos)));
      
      // Limpa os itens editados - agora itens() usará _orcamentoData que já tem os valores corretos
      this._itensEditados.set([]);

      loading.dismiss();
      this.showToast('Alterações salvas com sucesso!', 'success');

    } catch (error: any) {
      loading.dismiss();
      console.error('Erro ao salvar alterações:', error);
      this.showToast('Erro ao salvar alterações. Tente novamente.', 'danger');
    }
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
