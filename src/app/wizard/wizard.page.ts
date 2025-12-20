import { Component, OnInit, OnDestroy, inject, ViewChild, ElementRef, signal } from '@angular/core';
import { Router } from '@angular/router';
import { WizardStateService, ChatMessage } from '../services/wizard-state.service';
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
import { LoadingController, ToastController, ModalController, MenuController, IonContent } from '@ionic/angular';
import { LoginVM } from '../models/login-vm.model';
import { LeadCaptureModalComponent } from './components/lead-capture-modal.component';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-wizard',
  templateUrl: './wizard.page.html',
  styleUrls: ['./wizard.page.scss'],
  standalone: false,
})
export class WizardPage implements OnInit, OnDestroy {
  @ViewChild('content', { static: false }) content?: IonContent;
  
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
  private menuController = inject(MenuController);

  resultadoSimulacao?: PlanoSimulacaoResponse;
  isLoading = false;
  carregandoSetores = false;
  setoresDisponiveis: SetorDTO[] = [];
  
  // Controle do Chat
  chatHistory = this.wizardState.chatHistory;
  isTyping = false;
  tempName = ''; // Para o input do nome

  // Computed signals do estado
  currentStep = this.wizardState.currentStep;
  selectedSectors = this.wizardState.selectedSectors;
  assistants = this.wizardState.assistants;
  channels = this.wizardState.channels;
  infrastructure = this.wizardState.infrastructure;
  monthlyCredits = this.wizardState.monthlyCredits;
  tokensOpenAi = this.wizardState.tokensOpenAi;
  selectedPeriod = this.wizardState.selectedPeriod;

  async ngOnInit() {
    await this.menuController.enable(false);
    await this.loginAutomatico();
    this.wizardState.reset();
    this.carregarSetores();
    
    // Inicia o Chat
    setTimeout(() => this.startChat(), 500);
  }

  ngOnDestroy() {
    // Menu reabilitado pelo app.component
  }

  // --- Lógica do Chat ---

  async startChat() {
    this.isTyping = true;
    setTimeout(() => {
      this.isTyping = false;
      this.wizardState.addMessage({
        sender: 'eva',
        type: 'text',
        content: 'Olá! Sou a <strong>Eva</strong>, sua assistente virtual. 👋<br>Estou aqui para te ajudar a montar o plano perfeito para sua empresa.'
      });
      
      setTimeout(() => {
        this.wizardState.addMessage({
          sender: 'eva',
          type: 'text',
          content: 'Para começarmos, como posso te chamar?'
        });
        this.wizardState.setCurrentStep(0); // Passo 0: Nome
      }, 800);
    }, 1000);
  }

  confirmName() {
    if (!this.tempName.trim()) return;
    
    // Salva nome e adiciona mensagem do usuário
    this.wizardState.setUserName(this.tempName);
    this.wizardState.addMessage({
      sender: 'user',
      type: 'text',
      content: this.tempName
    });
    
    this.tempName = '';
    this.wizardState.nextStep(); // Vai para Passo 1 (Setores)
    this.scrollToBottom();
    
    // Resposta da Eva
    this.showEvaResponse(`Prazer, <strong>${this.wizardState.userName()}</strong>! 😉<br>Para eu entender melhor sua necessidade, em quais <strong>setores</strong> sua empresa precisa de reforço hoje?`);
  }

  async nextStep() {
    if (!this.canProceedToNextStep() || this.isLoading) return;

    const step = this.currentStep();
    
    // Adiciona resposta do usuário (Resumo do passo atual)
    this.addUserResponseSummary(step);

    // Lógica Específica de Transição
    if (step === 5) { // Volume -> Período
      const sucesso = await this.simularPlano();
      if (!sucesso) return;
    }

    // Avança o passo
    this.wizardState.nextStep();
    this.scrollToBottom();

    // Trigger da próxima pergunta da Eva
    this.triggerNextEvaQuestion(this.currentStep());
  }

  private addUserResponseSummary(step: number) {
    let content = '';
    switch (step) {
      case 1: // Setores
        const setores = this.selectedSectors().map(s => s.nome).join(', ');
        content = `Preciso de ajuda em: ${setores}.`;
        break;
      case 2: // Assistentes
        const assistentes = this.assistants().filter(a => a.quantity > 0)
          .map(a => `${a.quantity}x ${a.nome}`).join(', ');
        content = `Vou precisar de: ${assistentes}.`;
        break;
      case 3: // Canais
         content = 'Canais configurados.';
         break;
      case 4: // Infra
        content = this.infrastructure() === 1001 ? 'Prefiro a nuvem compartilhada.' : 'Quero servidor dedicado.';
        break;
      case 5: // Volume
        content = `Estimo cerca de ${this.monthlyCredits()} conversas/mês.`;
        break;
      case 6: // Período
        content = `Prefiro o plano ${this.selectedPeriod()}.`;
        break;
    }

    if (content) {
      this.wizardState.addMessage({
        sender: 'user',
        type: 'text',
        content: content
      });
    }
  }

  private triggerNextEvaQuestion(nextStep: number) {
    this.isTyping = true;
    this.scrollToBottom();

    setTimeout(() => {
      this.isTyping = false;
      let message = '';

      switch (nextStep) {
        case 2: // Setores -> Assistentes
          message = 'Ótima escolha! 🚀<br>Analisei seus setores e encontrei estes especialistas. <strong>Quantos assistentes</strong> de cada tipo você vai precisar?';
          break;
        case 3: // Assistentes -> Canais
          message = 'Entendido. Agora, por onde esses assistentes vão falar com seus clientes? 💬<br><strong>Configure os canais</strong> para cada um.';
          break;
        case 4: // Canais -> Infra
          message = 'Perfeito. Sobre a infraestrutura tecnológica...<br>Você prefere começar com algo mais ágil (Compartilhado) ou robusto (Dedicado)? 🖥️';
          break;
        case 5: // Infra -> Volume
          message = 'Estamos quase lá! 📈<br>Qual é a sua estimativa de <strong>conversas por mês</strong>?';
          break;
        case 6: // Volume -> Período (Com Simulação)
          message = `Certo, ${this.wizardState.userName()}. Já calculei tudo aqui. 🧮<br>Escolha o <strong>período de contratação</strong> para ver os descontos que consegui para você.`;
          break;
        case 7: // Período -> Resumo
          message = 'Prontinho! 🎉<br>Aqui está o <strong>resumo completo</strong> da sua operação. O que achou?';
          break;
      }

      if (message) {
        this.wizardState.addMessage({
          sender: 'eva',
          type: 'text',
          content: message
        });
        this.scrollToBottom();
      }
    }, 1500); // Delay para parecer digitação
  }

  private showEvaResponse(content: string) {
    this.isTyping = true;
    setTimeout(() => {
      this.isTyping = false;
      this.wizardState.addMessage({
        sender: 'eva',
        type: 'text',
        content
      });
      this.scrollToBottom();
    }, 1000);
  }

  scrollToBottom() {
    setTimeout(() => {
      this.content?.scrollToBottom(300);
    }, 100);
  }

  resetWizard() {
    this.wizardState.reset();
    this.startChat();
  }


  // --- Métodos Auxiliares Existentes (Mantidos para funcionar com os componentes) ---

  private async loginAutomatico(): Promise<void> {
    if (this.authService.isAuthenticated()) return;
    const credentials: LoginVM = { username: 'admin', password: 'admin', rememberMe: false };
    try {
      await firstValueFrom(this.authService.login(credentials).pipe(catchError(() => of(null))));
    } catch (e) { console.error(e); }
  }

  carregarSetores() {
    this.carregandoSetores = true;
    this.setorService.getAllSetors('id,asc', 0, 100).subscribe({
      next: (setores) => {
        this.setoresDisponiveis = setores;
        this.carregandoSetores = false;
      },
      error: () => {
        this.carregandoSetores = false;
        this.showToast('Erro ao carregar setores.', 'danger');
      }
    });
  }

  isSetorSelected(setor: SetorDTO): boolean {
    return this.selectedSectors().some(s => s.id === setor.id);
  }

  toggleSetor(setor: SetorDTO) {
    this.wizardState.toggleSector(setor);
  }

  canProceedToNextStep(): boolean {
    const step = this.currentStep();
    switch (step) {
      case 0: return !!this.tempName;
      case 1: return this.selectedSectors().length > 0;
      case 2: return this.assistants().some(a => a.quantity > 0);
      case 3: 
        const activeAssistants = this.assistants().filter(a => a.quantity > 0);
        if (activeAssistants.length === 0) return false;
        const assistantChannels = this.wizardState.assistantChannels();
        return activeAssistants.every(a => assistantChannels.some(ac => ac.assistantId === a.id && ac.enabled));
      case 4: return this.infrastructure() !== null;
      case 5: return this.monthlyCredits() > 0;
      case 6: return this.selectedPeriod() !== null;
      case 7: return true;
      default: return false;
    }
  }

  private async simularPlano(): Promise<boolean> {
    this.isLoading = true;
    const loading = await this.loadingController.create({ message: 'Calculando proposta...', spinner: 'dots', cssClass: 'custom-loading' });
    await loading.present();

    const planoBlueprint = this.converterParaPlanoBlueprint();

    return new Promise<boolean>((resolve) => {
      this.planoService.simularGeracao(planoBlueprint).subscribe({
        next: (response) => {
          loading.dismiss();
          this.isLoading = false;
          this.resultadoSimulacao = response;
          this.wizardState.setBaseMonthlyValue(response.valorMensalTotal);
          resolve(true);
        },
        error: (error) => {
          loading.dismiss();
          this.isLoading = false;
          this.showToast('Erro ao simular plano.', 'danger');
          resolve(false);
        }
      });
    });
  }

  // Mantive a lógica de finalizarOrcamento e converterParaDTOs igual
  // ... (Apenas garantindo que eles usem as propriedades da classe)

  async finalizarOrcamento() {
     // ... (Mesma lógica do arquivo original)
    if (!this.resultadoSimulacao || !this.selectedPeriod()) {
      this.showToast('Simulação incompleta.', 'warning');
      return;
    }

    const isAuthenticated = this.authService.isAuthenticated();
    let leadData: LeadData | undefined;

    if (!isAuthenticated) {
      const modal = await this.modalController.create({ component: LeadCaptureModalComponent });
      await modal.present();
      const { data } = await modal.onDidDismiss();
      if (!data) return;
      leadData = data;
    }

    // Lógica simplificada para buscar período e vendedor (mantida do original)
    const periodoCodigo = this.selectedPeriod();
    let periodoData: PeriodoContratacao | null = null;
    
    // ... Recuperação de dados (código abreviado para focar na mudança do chat)
    // Vou reescrever o bloco principal para garantir funcionamento

    try {
        if (periodoCodigo) {
            const periodos = await firstValueFrom(this.planoService.getPeriodosContratacao('id,asc').pipe(catchError(() => of([]))));
            periodoData = periodos?.find(p => p.codigo === periodoCodigo && p.ativo) || null;
        }

        const vendedors = await firstValueFrom(this.planoService.getVendedors('id,asc', 0, 100).pipe(catchError(() => of([]))));
        const vendedorId = vendedors?.find(v => v.tipo === 'SISTEMA_IA')?.id;

        if (!vendedorId) {
             this.showToast('Erro: Vendedor sistema não encontrado.', 'danger');
             return;
        }

        const orcamentoDTO = this.converterParaOrcamentoDTO(leadData, periodoData, vendedorId);
        
        const loading = await this.loadingController.create({ message: 'Gerando proposta...', spinner: 'crescent' });
        await loading.present();

        this.orcamentoService.create(orcamentoDTO).subscribe({
            next: (orcamento) => {
                loading.dismiss();
                if (orcamento.codigoHash) {
                    this.router.navigate(['/resultado-orcamento'], { queryParams: { hash: orcamento.codigoHash } });
                }
            },
            error: (err) => {
                loading.dismiss();
                this.showToast('Erro ao criar orçamento.', 'danger');
            }
        });

    } catch (e) {
        console.error(e);
        this.showToast('Erro inesperado.', 'danger');
    }
  }

  private converterParaOrcamentoDTO(leadData?: LeadData, periodoData?: PeriodoContratacao | null, vendedorId?: number | null): OrcamentoDTO {
    // Mesma lógica anterior, copiando para garantir integridade
    const state = this.wizardState.getState();
    const simulacao = this.resultadoSimulacao!;
    const baseMensal = simulacao.valorMensalTotal;
    let valorTotalFechado = baseMensal;
    let percentualDesconto = 0;

    if (periodoData && periodoData.tipoDesconto === 'PERCENTUAL' && periodoData.valorDesconto > 0) {
      percentualDesconto = periodoData.valorDesconto;
      valorTotalFechado = baseMensal * (1 - percentualDesconto / 100);
    } else if (periodoData && periodoData.tipoDesconto === 'VALOR_FIXO' && periodoData.valorDesconto > 0) {
      valorTotalFechado = Math.max(baseMensal - periodoData.valorDesconto, 0);
      percentualDesconto = (periodoData.valorDesconto / baseMensal) * 100;
    }

    const itens: ItemOrcamentoDTO[] = simulacao.itens.map(item => ({
      tipoItem: item.tipoItem as any,
      referenciaId: item.referenciaId,
      descricao: item.nomeComponente,
      quantidade: item.quantidade,
      precoUnitarioTabela: item.valorUnitarioMensal,
      precoUnitarioFechado: item.valorUnitarioMensal,
      totalMensalFechado: item.subtotalMensal,
      totalSetupFechado: item.subtotalSetup
    }));

    const orcamento: OrcamentoDTO = {
      status: 'RASCUNHO',
      valorTotalTabela: simulacao.valorMensalTotal,
      valorTotalMinimo: 0,
      valorTotalFechado: valorTotalFechado,
      percentualDescontoAplicado: percentualDesconto,
      infraestrutura: { id: state.infrastructure! },
      vendedor: { id: vendedorId! },
      itens: itens
    };

    if (this.authService.isAuthenticated()) {
      const empresaId = this.tokenStorage.getEmpresaId();
      if (empresaId) orcamento.empresa = { id: empresaId };
    }

    if (leadData) {
      orcamento.nomeProspect = leadData.nome;
      orcamento.emailProspect = leadData.email;
      if (leadData.telefone) orcamento.telefoneProspect = leadData.telefone;
    }

    return orcamento;
  }

  private converterParaPlanoBlueprint(): PlanoBlueprint {
     const state = this.wizardState.getState();
    const channelUsage: Record<number, number> = {};
    state.assistants.filter(a => a.quantity > 0).forEach(assistant => {
        state.assistantChannels.filter(ac => ac.assistantId === assistant.id && ac.enabled).forEach(ac => {
            channelUsage[ac.channelId] = (channelUsage[ac.channelId] || 0) + assistant.quantity;
        });
    });

    const itens = [
      ...(state.infrastructure ? [{ tipoItem: 'INFRAESTRUTURA' as const, referenciaId: state.infrastructure, quantidade: 1 }] : []),
      ...state.assistants.filter(a => a.quantity > 0).map(a => ({ tipoItem: 'ASSISTENTE' as const, referenciaId: a.id, quantidade: a.quantity })),
      ...Object.entries(channelUsage).map(([channelId, quantidade]) => ({ tipoItem: 'CANAL' as const, referenciaId: Number(channelId), quantidade }))
    ];

    return {
      nomePlano: `Plano ${state.selectedSectors.map(s => s.nome).join(', ')}`,
      itens,
      consumoEstimado: { tokensOpenAi: state.tokensOpenAi, mensagensWhatsapp: state.monthlyCredits }
    };
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({ message, duration: 3000, color, position: 'top' });
    await toast.present();
  }

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  }
}
