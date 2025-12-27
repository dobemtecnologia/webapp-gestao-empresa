import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OrcamentoService } from '../services/orcamento.service';
import { PlanoService } from '../services/plano.service';
import { SetorService } from '../services/setor.service';
import { OrcamentoDTO, ItemOrcamentoDTO } from '../models/orcamento.model';
import { PeriodoContratacao } from '../models/periodo-contratacao.model';
import { Infraestrutura } from '../models/infraestrutura.model';
import { LoadingController, ToastController } from '@ionic/angular';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface OrcamentoComItens {
  orcamento: OrcamentoDTO;
  itens: ItemOrcamentoDTO[];
}

interface Agente {
  id: number;
  nome: string;
  [key: string]: any;
}

interface AgenteAssistente {
  id: number;
  agente: Agente;
  assistente: { id: number; [key: string]: any };
  [key: string]: any;
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
  private setorService = inject(SetorService);
  private loadingController = inject(LoadingController);
  private toastController = inject(ToastController);

  // Signals para reatividade
  private _orcamentoData = signal<OrcamentoComItens | null>(null);
  private _isLoading = signal<boolean>(false);
  private _codigoHash = signal<string | null>(null);
  
  // Dados adicionais
  private _periodoData = signal<PeriodoContratacao | null>(null);
  private _infraestruturaData = signal<Infraestrutura | null>(null);
  private _setoresData = signal<any[]>([]);
  private _agentesPorAssistente = signal<Map<number, Agente[]>>(new Map());

  // Computed signals
  readonly orcamento = computed(() => this._orcamentoData()?.orcamento);
  readonly itens = computed(() => this._orcamentoData()?.itens || []);
  readonly isLoading = computed(() => this._isLoading());
  readonly codigoHash = computed(() => this._codigoHash());
  readonly periodoData = computed(() => this._periodoData());
  readonly infraestruturaData = computed(() => this._infraestruturaData());
  readonly setoresData = computed(() => this._setoresData());

  // Agrupa itens por tipo
  readonly itensPorTipo = computed(() => {
    const itensLista = this.itens();
    return {
      ASSISTENTE: itensLista.filter(i => i.tipoItem === 'ASSISTENTE'),
      CANAL: itensLista.filter(i => i.tipoItem === 'CANAL'),
      INFRAESTRUTURA: itensLista.filter(i => i.tipoItem === 'INFRAESTRUTURA')
    };
  });

  // Valores calculados
  readonly totalSetup = computed(() => {
    const itens = this.itens();
    return itens.reduce((sum, item) => sum + (item.totalSetupFechado || 0), 0);
  });

  readonly valorTotalFechado = computed(() => {
    const orc = this.orcamento();
    return orc?.valorTotalFechado || 0;
  });

  readonly valorTotalTabela = computed(() => {
    const orc = this.orcamento();
    return orc?.valorTotalTabela || 0;
  });

  readonly percentualDesconto = computed(() => {
    const orc = this.orcamento();
    return orc?.percentualDescontoAplicado || 0;
  });

  readonly valorComDesconto = computed(() => {
    return this.valorTotalFechado();
  });

  readonly totalInicial = computed(() => {
    return this.valorComDesconto() + this.totalSetup();
  });

  readonly linkCompartilhavel = computed(() => {
    const hash = this.codigoHash();
    if (!hash) return '';
    return `${window.location.origin}/resultado-orcamento?hash=${hash}`;
  });

  // Método para obter agentes de um assistente
  getAgentesPorAssistente(assistenteId: number): Agente[] {
    return this._agentesPorAssistente().get(assistenteId) || [];
  }

  ngOnInit() {
    const hash = this.route.snapshot.queryParams['hash'];
    if (hash) {
      this._codigoHash.set(hash);
      this.carregarOrcamento();
    } else {
      this.showToast('Hash do orçamento não encontrado.', 'danger');
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

    try {
    // Tenta buscar pelo endpoint customizado com hash
      const data = await firstValueFrom(
        this.orcamentoService.getByHashComItens(hash).pipe(
          catchError(async (error) => {
        if (error.status === 404) {
              // Fallback: busca pelo hash normal
              const orcamento = await firstValueFrom(
                this.orcamentoService.getByHash(hash).pipe(catchError(() => of(null)))
              );
              
              if (orcamento && orcamento.id) {
                const dataComItens = await firstValueFrom(
                  this.orcamentoService.getByIdComItens(orcamento.id).pipe(
                    catchError(() => of({ orcamento, itens: [] }))
                  )
                );
                return dataComItens;
              }
            }
            throw error;
          })
        )
      );

                      loading.dismiss();
                      this._isLoading.set(false);
                      this._orcamentoData.set(data);
      
      // Carregar dados adicionais em paralelo
      await Promise.all([
        this.buscarPeriodoContratacao(),
        this.buscarInfraestrutura(),
        this.buscarSetores(),
        this.buscarAgentesPorAssistentes()
      ]);

    } catch (error: any) {
              loading.dismiss();
              this._isLoading.set(false);
              let errorMessage = 'Erro ao carregar proposta.';
      if (error.status === 404) {
                errorMessage = 'Proposta não encontrada.';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
              }
              this.showToast(errorMessage, 'danger');
    }
  }

  async buscarPeriodoContratacao() {
    const orc = this.orcamento();
    if (!orc?.periodoId) return;

    try {
      const periodos = await firstValueFrom(
        this.planoService.getPeriodosContratacao('id,asc').pipe(
          catchError(() => of([]))
        )
      );
      const periodo = periodos.find((p: PeriodoContratacao) => p.id === orc.periodoId);
      if (periodo) {
        this._periodoData.set(periodo);
      }
    } catch (error) {
      console.error('Erro ao buscar período:', error);
    }
  }

  async buscarInfraestrutura() {
    const orc = this.orcamento();
    if (!orc?.infraestrutura?.id) return;

    try {
      const infraestruturas = await firstValueFrom(
        this.planoService.getInfraestruturas('id,asc').pipe(
          catchError(() => of([]))
        )
      );
      const infra = infraestruturas.find((i: Infraestrutura) => i.id === orc.infraestrutura!.id);
      if (infra) {
        this._infraestruturaData.set(infra);
      }
    } catch (error) {
      console.error('Erro ao buscar infraestrutura:', error);
    }
  }

  async buscarSetores() {
    const assistentes = this.itensPorTipo().ASSISTENTE;
    if (assistentes.length === 0) return;

    try {
      // Buscar assistentes para obter setores
      const todosAssistentes = await firstValueFrom(
        this.planoService.getAssistentes('id,asc', true).pipe(
          catchError(() => of([]))
        )
      );

      const assistentesIds = new Set(assistentes.map(a => a.referenciaId));
      const setoresIds = new Set<number>();

      // Extrair setores dos assistentes
      todosAssistentes.forEach((assistente: any) => {
        if (assistentesIds.has(assistente.id)) {
          const setores = assistente.setors || assistente.setores || [];
          setores.forEach((setor: any) => {
            const setorId = typeof setor === 'object' ? setor.id : setor;
            if (setorId) setoresIds.add(setorId);
          });
        }
      });

      // Buscar setores completos
      if (setoresIds.size > 0) {
        const setores = await firstValueFrom(
          this.setorService.getAllSetors('id,asc', 0, 100, true).pipe(
            catchError(() => of([]))
          )
        );
        const setoresSelecionados = setores.filter((s: any) => setoresIds.has(s.id));
        this._setoresData.set(setoresSelecionados);
      }
    } catch (error) {
      console.error('Erro ao buscar setores:', error);
    }
  }

  async buscarAgentesPorAssistentes() {
    const assistentes = this.itensPorTipo().ASSISTENTE;
    if (assistentes.length === 0) return;

    try {
      // Buscar todos os relacionamentos agente-assistente
      const agenteAssistentes = await firstValueFrom(
        this.planoService.getAgenteAssistentes(true).pipe(
          catchError(() => of([]))
        )
      );

      const agentesMap = new Map<number, Agente[]>();

      assistentes.forEach(item => {
        const assistenteId = item.referenciaId;
        const relacionamentos = agenteAssistentes.filter((aa: AgenteAssistente) => 
          aa.assistente?.id === assistenteId
        );
        
        const agentes = relacionamentos
          .map((aa: AgenteAssistente) => aa.agente)
          .filter((agente: Agente) => agente && agente.id);
        
        if (agentes.length > 0) {
          agentesMap.set(assistenteId, agentes);
        }
      });

      this._agentesPorAssistente.set(agentesMap);
    } catch (error) {
      console.error('Erro ao buscar agentes:', error);
    }
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

  aprovarEAtivar() {
    // TODO: Redirecionar para checkout/pagamento
    const hash = this.codigoHash();
    if (hash) {
      // Exemplo: this.router.navigate(['/checkout'], { queryParams: { hash } });
      this.showToast('Redirecionando para checkout...', 'success');
    } else {
      this.showToast('Hash da proposta não encontrado.', 'warning');
    }
  }

  editarProposta() {
    const hash = this.codigoHash();
    if (hash) {
      this.router.navigate(['/formulario-orcamento'], { 
        queryParams: { hash, action: 'edit' } 
      });
    } else {
      this.showToast('Hash da proposta não encontrado.', 'warning');
    }
  }

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  formatarPercentual(valor: number): string {
    if (valor % 1 === 0) {
      return valor.toFixed(0);
    }
    return valor.toFixed(2);
  }

  getDadosCliente() {
    const orc = this.orcamento();
    return {
      nome: orc?.nomeProspect || 'N/A',
      email: orc?.emailProspect || 'N/A',
      telefone: orc?.telefoneProspect || 'N/A'
    };
  }

  getNomePeriodo(): string {
    return this.periodoData()?.nome || 'N/A';
  }

  getDescricaoPeriodo(): string {
    const periodo = this.periodoData();
    if (!periodo) return '';
    
    const meses = periodo.meses;
    const desconto = periodo.valorDesconto;
    const tipoDesconto = periodo.tipoDesconto;
    
    let descricao = `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
    
    if (desconto > 0) {
      if (tipoDesconto === 'PERCENTUAL') {
        descricao += ` - ${this.formatarPercentual(desconto)}% de desconto`;
      } else {
        descricao += ` - ${this.formatarMoeda(desconto)} de desconto`;
      }
    }
    
    return descricao;
  }

  getNomeInfraestrutura(): string {
    return this.infraestruturaData()?.nome || 'N/A';
  }

  getSetoresFormatados(): string {
    const setores = this.setoresData();
    if (setores.length === 0) return 'N/A';
    return setores.map((s: any) => s.nome || s).join(', ');
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
