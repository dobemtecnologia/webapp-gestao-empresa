import { Component, OnInit, OnDestroy, inject, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { WizardStateService, ChatMessage } from '../services/wizard-state.service';
import { WizardFirebaseService } from '../services/wizard-firebase.service';
import { PlanoService } from '../services/plano.service';
import { OrcamentoService } from '../services/orcamento.service';
import { SetorService } from '../services/setor.service';
import { CnpjService } from '../services/cnpj.service';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';
import { CNPJResponse } from '../models/cnpj-response.model';
import { SetorDTO } from '../models/setor.model';
import { PlanoBlueprint } from '../models/plano-blueprint.model';
import { PlanoSimulacaoResponse } from '../models/plano-simulacao-response.model';
import { OrcamentoDTO, ItemOrcamentoDTO, LeadData } from '../models/orcamento.model';
import { PeriodoContratacao } from '../models/periodo-contratacao.model';
import { LoadingController, ToastController, MenuController, IonContent } from '@ionic/angular';
import { LoginVM } from '../models/login-vm.model';
import { firstValueFrom, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-wizard',
  templateUrl: './wizard.page.html',
  styleUrls: ['./wizard.page.scss'],
  standalone: false,
})
export class WizardPage implements OnInit, OnDestroy {
  @ViewChild('content', { static: false }) content?: IonContent;
  
  wizardState = inject(WizardStateService);
  private firebaseService = inject(WizardFirebaseService);
  private router = inject(Router);
  private planoService = inject(PlanoService);
  private orcamentoService = inject(OrcamentoService);
  private setorService = inject(SetorService);
  private cnpjService = inject(CnpjService);
  private authService = inject(AuthService);
  private tokenStorage = inject(TokenStorageService);
  private loadingController = inject(LoadingController);
  private toastController = inject(ToastController);
  private menuController = inject(MenuController);

  resultadoSimulacao?: PlanoSimulacaoResponse;
  isLoading = false;
  carregandoSetores = false;
  setoresDisponiveis: SetorDTO[] = [];
  orcamentoFinalizadoHash: string | null = null;
  
  // Controle do Chat
  chatHistory = this.wizardState.chatHistory;
  isTyping = false;
  tempName = ''; 
  tempEmail = ''; // Para captura de lead
  tempPhone = ''; // Opcional
  tempCNPJ = ''; // Para captura de CNPJ
  isConsultingCNPJ = false;

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
    
    // Carrega setores primeiro (necessário para renderizar)
    this.carregarSetores();
    
    // Cria ou recupera o Session ID logo no início (garante persistência do navegador)
    // Isso garante que mesmo novos usuários tenham um ID único associado ao navegador
    const sessionId = this.firebaseService.getOrCreateSessionId();
    console.log('📝 Session ID para esta sessão:', sessionId);
    
    // Tenta restaurar sessão do Firebase ANTES de resetar
    console.log('Verificando sessão existente no Firebase...');
    const restored = await this.wizardState.restoreSession();
    
    if (restored) {
      // Sessão restaurada com sucesso - apenas rola para o final do chat
      console.log('✅ Sessão restaurada! Carregando histórico...');
      this.scrollToBottom();
      
      // Restaura dados temporários se necessário
      if (this.wizardState.userName()) {
        this.tempName = this.wizardState.userName();
      }
    } else {
      // Não há sessão - começa do zero
      console.log('🆕 Nenhuma sessão encontrada. Iniciando nova conversa...');
      this.wizardState.reset();
      setTimeout(() => this.startChat(), 500);
    }
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
        content: 'Olá! Sou a <strong>Eva</strong>, sua assistente operacional. 👋<br>Estou aqui para te ajudar a montar o plano perfeito para sua empresa.'
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
    
    this.wizardState.setUserName(this.tempName);
    this.wizardState.addMessage({ sender: 'user', type: 'text', content: this.tempName });
    
    this.tempName = '';
    this.scrollToBottom();
    
    // Pergunta pelo CNPJ ao invés de ir direto para setores
    setTimeout(() => {
      this.wizardState.setCurrentStep(0.5); // Passo intermediário: CNPJ
      this.showEvaResponse(`Prazer, <strong>${this.wizardState.userName()}</strong>! 😉<br>Para eu conhecer melhor sua empresa e já preparar as melhores configurações, qual é o <strong>CNPJ</strong> da sua empresa?`);
    }, 800);
  }

  formatarCNPJ(cnpj: string): string {
    // Remove tudo que não é dígito
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    
    // Aplica a máscara XX.XXX.XXX/XXXX-XX
    if (cnpjLimpo.length <= 2) {
      return cnpjLimpo;
    } else if (cnpjLimpo.length <= 5) {
      return cnpjLimpo.replace(/(\d{2})(\d+)/, '$1.$2');
    } else if (cnpjLimpo.length <= 8) {
      return cnpjLimpo.replace(/(\d{2})(\d{3})(\d+)/, '$1.$2.$3');
    } else if (cnpjLimpo.length <= 12) {
      return cnpjLimpo.replace(/(\d{2})(\d{3})(\d{3})(\d+)/, '$1.$2.$3/$4');
    } else {
      return cnpjLimpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  }

  onCNPJInput(event: any) {
    const valor = event.target.value || '';
    this.tempCNPJ = this.formatarCNPJ(valor);
  }

  async consultarCNPJ() {
    const cnpjLimpo = this.tempCNPJ.replace(/\D/g, '');
    
    if (cnpjLimpo.length !== 14) {
      this.showToast('CNPJ inválido. Por favor, digite um CNPJ válido (14 dígitos).', 'warning');
      return;
    }

    this.isConsultingCNPJ = true;
    this.isTyping = true;

    try {
      const cnpjData: CNPJResponse = await firstValueFrom(this.cnpjService.consultarCNPJ(cnpjLimpo));
      
      // Adiciona mensagem do usuário com CNPJ
      this.wizardState.addMessage({ 
        sender: 'user', 
        type: 'text', 
        content: cnpjData.cnpj 
      });

      // Salva dados da empresa
      this.wizardState.setEmpresaData({
        cnpj: cnpjData.cnpj,
        razaoSocial: cnpjData.razaoSocial,
        nomeFantasia: cnpjData.nomeFantasia
      });

      // Busca o setor completo pelo ID sugerido
      if (cnpjData.setorSugerido && cnpjData.setorSugerido.id) {
        try {
          const setorCompleto: SetorDTO = await firstValueFrom(
            this.setorService.getSetorById(cnpjData.setorSugerido.id)
          );
          
          // Seleciona o setor automaticamente
          this.wizardState.toggleSector(setorCompleto);
          
          this.tempCNPJ = '';
          this.scrollToBottom();

          // Mensagem da Eva confirmando a seleção
          setTimeout(() => {
            this.isTyping = false;
            const nomeEmpresa = cnpjData.nomeFantasia || cnpjData.razaoSocial;
            const nomeSetor = cnpjData.setorSugerido.nome;
            
            this.wizardState.addMessage({
              sender: 'eva',
              type: 'text',
              content: `Perfeito, <strong>${this.wizardState.userName()}</strong>! 💼<br>Localizei a empresa <strong>${nomeEmpresa}</strong>. Como vocês atuam no ramo de <strong>${nomeSetor}</strong>, já preparei as melhores configurações para vocês. Vamos prosseguir?`
            });

            // Avança automaticamente para o passo de Assistentes após delay
            setTimeout(() => {
              this.wizardState.setCurrentStep(2); // Passo 2: Assistentes
              this.scrollToBottom();
              
              setTimeout(() => {
                this.showEvaResponse('Ótima escolha! 🚀<br>Analisei seus setores e encontrei estes especialistas. <strong>Quantos assistentes</strong> de cada tipo você vai precisar?');
              }, 500);
            }, 2000);
          }, 1000);
          
        } catch (setorError) {
          console.error('Erro ao buscar setor:', setorError);
          // Se não conseguir buscar o setor completo, continua sem seleção automática
          this.handleCNPJError('Não foi possível identificar o setor da empresa. Você pode selecionar manualmente.');
        }
      } else {
        // Não há setor sugerido
        this.handleCNPJError('Não foi possível identificar o setor da empresa. Você pode selecionar manualmente.');
      }
      
    } catch (error: any) {
      console.error('Erro ao consultar CNPJ:', error);
      this.isTyping = false;
      this.isConsultingCNPJ = false;
      
      let errorMessage = 'Erro ao consultar CNPJ. Tente novamente.';
      if (error.status === 404) {
        errorMessage = 'CNPJ não encontrado. Verifique se o CNPJ está correto.';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      }
      
      this.showToast(errorMessage, 'danger');
    }
  }

  private handleCNPJError(message: string) {
    this.isTyping = false;
    this.isConsultingCNPJ = false;
    this.showToast(message, 'warning');
    
    // Vai para seleção manual de setores
    this.wizardState.setCurrentStep(1);
    this.scrollToBottom();
    setTimeout(() => {
      this.showEvaResponse(`Prazer, <strong>${this.wizardState.userName()}</strong>! 😉<br>Para eu entender melhor sua necessidade, em quais <strong>setores</strong> sua empresa precisa de reforço hoje?`);
    }, 500);
  }

  confirmEmail() {
    if (!this.isValidEmail(this.tempEmail)) {
      this.showToast('Por favor, insira um e-mail válido.', 'warning');
      return;
    }

    // 1. Adiciona mensagem do usuário e rola a tela
    const contactInfo = this.tempPhone ? `${this.tempEmail} | ${this.tempPhone}` : this.tempEmail;
    this.wizardState.addMessage({ sender: 'user', type: 'text', content: contactInfo });
    this.scrollToBottom();
    
    // 2. Esconde o footer (input) imediatamente e mostra "Eva digitando..."
    this.isTyping = true;

    // 3. Inicia processo de finalização (API)
    this.finalizarOrcamento();
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

  iniciarCapturaLead() {
    // Passo 7 -> 8 (Captura de Lead)
    this.wizardState.addMessage({ 
      sender: 'user', 
      type: 'text', 
      content: 'Quero gerar a proposta oficial.' 
    });
    
    this.wizardState.setCurrentStep(8); // Passo 8: Captura de Email
    this.scrollToBottom();

    this.showEvaResponse(`Com certeza, ${this.wizardState.userName()}! Já preparei tudo por aqui. 📄<br>Para onde posso enviar sua proposta formal e o link de acesso exclusivo?`);
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
      this.wizardState.addMessage({ sender: 'user', type: 'text', content });
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
        this.wizardState.addMessage({ sender: 'eva', type: 'text', content: message });
        this.scrollToBottom();
      }
    }, 1500);
  }

  private showEvaResponse(content: string) {
    this.isTyping = true;
    setTimeout(() => {
      this.isTyping = false;
      this.wizardState.addMessage({ sender: 'eva', type: 'text', content });
      this.scrollToBottom();
    }, 1000);
  }

  scrollToBottom() {
    setTimeout(() => {
      this.content?.scrollToBottom(300);
    }, 100);
  }

  resetWizard() {
    this.orcamentoFinalizadoHash = null;
    this.tempEmail = '';
    this.tempName = '';
    this.tempPhone = ''; // Reset phone
    this.wizardState.reset();
    this.startChat();
  }

  verPropostaCompleta() {
    if (this.orcamentoFinalizadoHash) {
      this.router.navigate(['/resultado-orcamento'], { queryParams: { hash: this.orcamentoFinalizadoHash } });
    }
  }

  // --- Lógica de Negócio ---

  async finalizarOrcamento() {
    if (!this.resultadoSimulacao || !this.selectedPeriod()) {
      this.showToast('Simulação incompleta.', 'warning');
      this.isTyping = false; // Restaura UI em caso de erro
      return;
    }

    const leadData: LeadData = {
      nome: this.wizardState.userName(),
      email: this.tempEmail,
      telefone: this.tempPhone
    };

    try {
      this.isLoading = true;
      
      // Busca dados necessários
      const periodoCodigo = this.selectedPeriod();
      let periodoData: PeriodoContratacao | null = null;

      if (periodoCodigo) {
        const periodos = await firstValueFrom(this.planoService.getPeriodosContratacao('id,asc').pipe(catchError(() => of([]))));
        periodoData = periodos?.find(p => p.codigo === periodoCodigo && p.ativo) || null;
      }

      const vendedors = await firstValueFrom(this.planoService.getVendedors('id,asc', 0, 100).pipe(catchError(() => of([]))));
      const vendedorId = vendedors?.find(v => v.tipo === 'SISTEMA_IA')?.id;

      if (!vendedorId) throw new Error('Vendedor sistema não encontrado');

      const orcamentoDTO = this.converterParaOrcamentoDTO(leadData, periodoData, vendedorId);

      // Envia para API
      this.orcamentoService.create(orcamentoDTO)
        .pipe(
          finalize(() => {
            this.isLoading = false;
            // Mantém isTyping como true por enquanto, pois vamos tratar no subscribe ou no timeout
          })
        )
        .subscribe({
          next: async (orcamento) => {
            if (orcamento.codigoHash) {
              // Sucesso direto
              this.handleSuccess(orcamento);
            } else if (orcamento.id) {
              // Fallback: Tenta buscar pelo ID se o hash vier nulo na criação
              console.warn('Hash nulo na criação. Tentando buscar pelo ID:', orcamento.id);
              try {
                const orcamentoCompleto = await firstValueFrom(this.orcamentoService.getById(orcamento.id!));
                if (orcamentoCompleto && orcamentoCompleto.codigoHash) {
                  this.handleSuccess(orcamentoCompleto);
                } else {
                  this.handleError(new Error('Hash não gerado mesmo após nova busca.'));
                }
              } catch (e) {
                this.handleError(e);
              }
            } else {
              this.handleError(new Error('Orçamento criado sem ID nem Hash.'));
            }
          },
          error: (err) => {
            this.handleError(err);
          }
        });

    } catch (e) {
      this.handleError(e);
    }
  }

  private handleSuccess(orcamento: OrcamentoDTO) {
    this.orcamentoFinalizadoHash = orcamento.codigoHash!;
    
    // Sucesso: Delay para naturalidade
    setTimeout(() => {
        this.isTyping = false; // AGORA mostra o footer
        this.wizardState.setCurrentStep(9); // Passo 9: Sucesso
        
        this.wizardState.addMessage({
          sender: 'eva',
          type: 'text',
          content: `Obrigada, <strong>${this.wizardState.userName()}</strong>! 💙<br><br>Aguarde nosso contato. Você receberá um e-mail em <strong>${this.tempEmail}</strong> com a proposta do orçamento que fizemos aqui.<br><br>Se precisar de mim, é só chamar!`
        });
        this.scrollToBottom();
    }, 1000);
  }

  private handleError(err: any) {
    console.error('Erro na finalização:', err);
    this.isTyping = false; // Garante que destrava
    this.isLoading = false;
    this.showToast('Erro ao gerar proposta. Tente novamente.', 'danger');
    this.wizardState.setCurrentStep(7); // Volta para review
  }

  // --- Métodos Auxiliares ---
  // ... (restante dos métodos auxiliares mantidos igual)

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
    const selected = this.selectedSectors();
    const isSelected = selected.some(s => s.id === setor.id);
    return isSelected;
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
      case 8: return this.isValidEmail(this.tempEmail);
      default: return false;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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

  private converterParaOrcamentoDTO(leadData?: LeadData, periodoData?: PeriodoContratacao | null, vendedorId?: number | null): OrcamentoDTO {
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
