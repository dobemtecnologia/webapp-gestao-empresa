import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { WizardStateService } from '../services/wizard-state.service';
import { PlanoService } from '../services/plano.service';
import { OrcamentoService } from '../services/orcamento.service';
import { SetorService } from '../services/setor.service';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';
import { PlanoBlueprint } from '../models/plano-blueprint.model';
import { PlanoSimulacaoResponse } from '../models/plano-simulacao-response.model';
import { OrcamentoDTO, ItemOrcamentoDTO, LeadData } from '../models/orcamento.model';
import { PeriodoContratacao } from '../models/periodo-contratacao.model';
import { VendedorDTO } from '../models/vendedor.model';
import { SetorDTO } from '../models/setor.model';
import { LoadingController, ToastController, ModalController } from '@ionic/angular';
import { LeadCaptureModalComponent } from './components/lead-capture-modal.component';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-wizard',
  templateUrl: './wizard.page.html',
  styleUrls: ['./wizard.page.scss'],
  standalone: false,
})
export class WizardPage implements OnInit {
  wizardState = inject(WizardStateService);
  private router = inject(Router);
  private planoService = inject(PlanoService);
  private orcamentoService = inject(OrcamentoService);
  private setorService = inject(SetorService);
  private authService = inject(AuthService);
  private tokenStorage = inject(TokenStorageService);
  private loadingController = inject(LoadingController);
  private toastController = inject(ToastController);
  private modalController = inject(ModalController);

  resultadoSimulacao?: PlanoSimulacaoResponse;
  isLoading = false;
  carregandoSetores = false;
  setoresDisponiveis: SetorDTO[] = [];

  // Computed signals do estado
  currentStep = this.wizardState.currentStep;
  selectedSectors = this.wizardState.selectedSectors;
  assistants = this.wizardState.assistants;
  channels = this.wizardState.channels;
  infrastructure = this.wizardState.infrastructure;
  monthlyCredits = this.wizardState.monthlyCredits;
  tokensOpenAi = this.wizardState.tokensOpenAi;
  selectedPeriod = this.wizardState.selectedPeriod;

  ngOnInit() {
    // Reset do wizard ao entrar na página
    this.wizardState.reset();
    // Carrega setores da API
    this.carregarSetores();
  }

  carregarSetores() {
    this.carregandoSetores = true;
    this.setorService.getAllSetors('id,asc', 0, 100).subscribe({
      next: (setores) => {
        this.setoresDisponiveis = setores;
        this.carregandoSetores = false;
      },
      error: (error) => {
        console.error('Erro ao carregar setores:', error);
        this.carregandoSetores = false;
        this.showToast('Erro ao carregar setores. Tente novamente.', 'danger');
      }
    });
  }

  isSetorSelected(setor: SetorDTO): boolean {
    return this.selectedSectors().some(s => s.id === setor.id);
  }

  toggleSetor(setor: SetorDTO) {
    this.wizardState.toggleSector(setor);
  }

  async nextStep() {
    if (!this.canProceedToNextStep() || this.isLoading) {
      return;
    }

    const step = this.currentStep();

    // Ao sair do passo 5 para o 6 (período), simulamos o plano automaticamente
    if (step === 5) {
      const sucesso = await this.simularPlano();
      if (!sucesso) {
        return;
      }
    }

    this.wizardState.nextStep();
  }

  previousStep() {
    this.wizardState.previousStep();
  }

  canProceedToNextStep(): boolean {
    const step = this.currentStep();
    
    switch (step) {
      case 1:
        return this.selectedSectors().length > 0;
      case 2:
        return this.assistants().some(a => a.quantity > 0);
      case 3:
        // Cada assistente com quantidade > 0 precisa ter pelo menos um canal associado
        const activeAssistants = this.assistants().filter(a => a.quantity > 0);
        if (activeAssistants.length === 0) return false;
        const assistantChannels = this.wizardState.assistantChannels();
        return activeAssistants.every(a =>
          assistantChannels.some(ac => ac.assistantId === a.id && ac.enabled)
        );
      case 4:
        return this.infrastructure() !== null;
      case 5:
        return this.monthlyCredits() > 0;
      case 6:
        return this.selectedPeriod() !== null;
      case 7:
        return true;
      default:
        return false;
    }
  }

  private async simularPlano(): Promise<boolean> {
    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Simulando plano...',
      spinner: 'crescent'
    });
    await loading.present();

    const planoBlueprint = this.converterParaPlanoBlueprint();

    return new Promise<boolean>((resolve) => {
      this.planoService.simularGeracao(planoBlueprint).subscribe({
        next: (response) => {
          loading.dismiss();
          this.isLoading = false;
          this.resultadoSimulacao = response;
          // Guarda o valor mensal base no estado do wizard
          this.wizardState.setBaseMonthlyValue(response.valorMensalTotal);
          resolve(true);
        },
        error: (error) => {
          loading.dismiss();
          this.isLoading = false;
          let errorMessage = 'Erro ao simular plano. Tente novamente.';
          if (error.error?.message) {
            errorMessage = error.error.message;
          }
          this.showToast(errorMessage, 'danger');
          resolve(false);
        }
      });
    });
  }

  irParaModoAvancado() {
    // Navega para a página de simulação avançada
    // Os dados podem ser pré-preenchidos via query params se necessário
    this.router.navigate(['/simulacao']);
  }

  async finalizarOrcamento() {
    // Validações
    if (!this.resultadoSimulacao) {
      this.showToast('É necessário simular o plano primeiro.', 'warning');
      return;
    }

    if (!this.selectedPeriod()) {
      this.showToast('É necessário selecionar um período de contratação.', 'warning');
      return;
    }

    // Verifica autenticação
    const isAuthenticated = this.authService.isAuthenticated();
    let leadData: LeadData | undefined;

    // Se não autenticado, abre modal de captura de lead
    if (!isAuthenticated) {
      const modal = await this.modalController.create({
        component: LeadCaptureModalComponent
      });
      await modal.present();

      const { data } = await modal.onDidDismiss();
      if (!data || !data.nome || !data.email) {
        return; // Usuário cancelou ou não preencheu
      }
      leadData = data;
    }

    // Busca período para calcular desconto antes de montar DTO
    const periodoCodigo = this.selectedPeriod();
    let periodoData: PeriodoContratacao | null = null;

    if (periodoCodigo) {
      try {
        const periodos = await firstValueFrom(
          this.planoService.getPeriodosContratacao('id,asc').pipe(
            catchError(() => of([]))
          )
        );
        
        if (periodos && periodos.length > 0) {
          periodoData = periodos.find(p => p.codigo === periodoCodigo && p.ativo) || null;
        }
      } catch (error) {
        console.error('Erro ao buscar período:', error);
      }
    }

    // Busca vendedores para obter um ID válido (tipo SISTEMA_IA)
    let vendedorId: number | null = null;
    try {
      // Busca mais vendedores para garantir que encontre um do tipo SISTEMA_IA
      const vendedors = await firstValueFrom(
        this.planoService.getVendedors('id,asc', 0, 100).pipe(
          catchError(() => of([]))
        )
      );
      
      if (vendedors && vendedors.length > 0) {
        // Filtra e pega o primeiro vendedor do tipo SISTEMA_IA
        const vendedorSistemaIA = vendedors.find(v => v.tipo === 'SISTEMA_IA');
        
        if (vendedorSistemaIA) {
          vendedorId = vendedorSistemaIA.id;
        } else {
          this.showToast('Nenhum vendedor do tipo SISTEMA_IA disponível. Não foi possível criar a proposta.', 'danger');
          return;
        }
      } else {
        this.showToast('Nenhum vendedor disponível. Não foi possível criar a proposta.', 'danger');
        return;
      }
    } catch (error) {
      console.error('Erro ao buscar vendedores:', error);
      this.showToast('Erro ao buscar vendedores. Tente novamente.', 'danger');
      return;
    }

    // Monta DTO
    const orcamentoDTO = this.converterParaOrcamentoDTO(leadData, periodoData, vendedorId);

    // Loading
    const loading = await this.loadingController.create({
      message: 'Gerando proposta...',
      spinner: 'crescent'
    });
    await loading.present();

    // Chama API
    this.orcamentoService.create(orcamentoDTO).subscribe({
      next: (orcamentoSalvo) => {
        loading.dismiss();
        // Redireciona para página de resultado
        if (orcamentoSalvo.codigoHash) {
          this.router.navigate(['/resultado-orcamento'], {
            queryParams: { hash: orcamentoSalvo.codigoHash }
          });
        } else {
          this.showToast('Proposta gerada com sucesso!', 'success');
        }
      },
      error: (error) => {
        loading.dismiss();
        let errorMessage = 'Erro ao gerar proposta. Tente novamente.';
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 400) {
          errorMessage = 'Dados inválidos. Verifique os campos preenchidos.';
        } else if (error.status === 401) {
          errorMessage = 'Não autorizado. Faça login novamente.';
        }
        this.showToast(errorMessage, 'danger');
      }
    });
  }

  private converterParaOrcamentoDTO(leadData?: LeadData, periodoData?: PeriodoContratacao | null, vendedorId?: number | null): OrcamentoDTO {
    const state = this.wizardState.getState();
    const simulacao = this.resultadoSimulacao!;

    if (!simulacao || !state.infrastructure) {
      throw new Error('Simulação ou infraestrutura não encontrada');
    }

    // Calcula valores com desconto do período
    const baseMensal = simulacao.valorMensalTotal;
    let valorTotalFechado = baseMensal;
    let percentualDesconto = 0;

    // Aplica desconto se período foi fornecido
    if (periodoData && periodoData.tipoDesconto === 'PERCENTUAL' && periodoData.valorDesconto > 0) {
      percentualDesconto = periodoData.valorDesconto;
      valorTotalFechado = baseMensal * (1 - percentualDesconto / 100);
    } else if (periodoData && periodoData.tipoDesconto === 'VALOR_FIXO' && periodoData.valorDesconto > 0) {
      valorTotalFechado = Math.max(baseMensal - periodoData.valorDesconto, 0);
      percentualDesconto = (periodoData.valorDesconto / baseMensal) * 100;
    }

    // Mapeia itens da simulação para ItemOrcamentoDTO
    const itens: ItemOrcamentoDTO[] = simulacao.itens.map(item => ({
      tipoItem: item.tipoItem as 'INFRAESTRUTURA' | 'ASSISTENTE' | 'CANAL' | 'PACOTE_CREDITOS',
      referenciaId: item.referenciaId,
      descricao: item.nomeComponente,
      quantidade: item.quantidade,
      precoUnitarioTabela: item.valorUnitarioMensal,
      precoUnitarioFechado: item.valorUnitarioMensal, // Inicialmente igual à tabela
      totalMensalFechado: item.subtotalMensal,
      totalSetupFechado: item.subtotalSetup
    }));

    if (!vendedorId) {
      throw new Error('ID do vendedor não fornecido');
    }

    const orcamento: OrcamentoDTO = {
      status: 'RASCUNHO',
      valorTotalTabela: simulacao.valorMensalTotal,
      valorTotalMinimo: 0, // Backend calcula
      valorTotalFechado: valorTotalFechado,
      percentualDescontoAplicado: percentualDesconto,
      infraestrutura: { id: state.infrastructure },
      vendedor: { id: vendedorId },
      itens: itens
    };

    // Se usuário logado, vincula à empresa
    if (this.authService.isAuthenticated()) {
      const empresaId = this.tokenStorage.getEmpresaId();
      if (empresaId) {
        orcamento.empresa = { id: empresaId };
      }
    }

    // Se lead (usuário anônimo), adiciona dados do prospect
    if (leadData) {
      orcamento.nomeProspect = leadData.nome;
      orcamento.emailProspect = leadData.email;
      if (leadData.telefone) {
        orcamento.telefoneProspect = leadData.telefone;
      }
    }

    return orcamento;
  }

  private converterParaPlanoBlueprint(): PlanoBlueprint {
    const state = this.wizardState.getState();
    
    // Calcula o uso de canais com base no mapeamento assistente x canal
    const channelUsage: Record<number, number> = {};
    state.assistants
      .filter(a => a.quantity > 0)
      .forEach(assistant => {
        state.assistantChannels
          .filter(ac => ac.assistantId === assistant.id && ac.enabled)
          .forEach(ac => {
            channelUsage[ac.channelId] = (channelUsage[ac.channelId] || 0) + assistant.quantity;
          });
      });

    const itens = [
      // Infraestrutura
      ...(state.infrastructure ? [{
        tipoItem: 'INFRAESTRUTURA' as const,
        referenciaId: state.infrastructure,
        quantidade: 1
      }] : []),
      
      // Assistentes
      ...state.assistants
        .filter(a => a.quantity > 0)
        .map(a => ({
          tipoItem: 'ASSISTENTE' as const,
          referenciaId: a.id,
          quantidade: a.quantity
        })),
      
      // Canais (quantidade proporcional à quantidade de assistentes que usam cada canal)
      ...Object.entries(channelUsage).map(([channelId, quantidade]) => ({
        tipoItem: 'CANAL' as const,
        referenciaId: Number(channelId),
        quantidade
      }))
    ];

    return {
      nomePlano: `Plano ${state.selectedSectors.join(', ')}`,
      itens,
      consumoEstimado: {
        tokensOpenAi: state.tokensOpenAi,
        mensagensWhatsapp: state.monthlyCredits
      }
    };
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

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }
}
