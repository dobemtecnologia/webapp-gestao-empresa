import { Component, OnInit, OnDestroy, inject, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
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
import { Assistente } from '../models/assistente.model';
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
  private route = inject(ActivatedRoute);
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
    
    // Verifica se há hash na query string para edição
    const hash = this.route.snapshot.queryParams['hash'];
    if (hash) {
      console.log('🔍 Hash encontrado na URL. Carregando orçamento para edição...', hash);
      await this.carregarOrcamentoParaEdicao(hash);
      return; // Não restaura sessão do Firebase se estiver editando
    }
    
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
      
      // Se restaurou em um passo avançado, garante que a simulação esteja pronta
      if (this.wizardState.currentStep() >= 6 && !this.resultadoSimulacao) {
        console.log('🔄 Restaurando simulação em background...');
        this.simularPlano().then(() => console.log('✅ Simulação restaurada.'));
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
    // Habilita o campo CNPJ imediatamente, sem esperar a mensagem da Eva
    this.wizardState.setCurrentStep(0.5); // Passo intermediário: CNPJ
    this.isConsultingCNPJ = false; // Garante que o campo está habilitado
    this.isTyping = false; // Garante que não está bloqueado
    
    // Mostra a mensagem da Eva em paralelo, sem bloquear o campo
    setTimeout(() => {
      this.showEvaResponse(`Prazer, <strong>${this.wizardState.userName()}</strong>! 😉<br>Para eu conhecer melhor sua empresa e já preparar as melhores configurações, qual é o <strong>CNPJ</strong> da sua empresa?`);
    }, 300);
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

    // Desabilita o campo apenas durante a consulta
    this.isConsultingCNPJ = true;
    // Não bloqueia o chat com isTyping aqui, apenas durante a consulta do CNPJ

    try {
      const cnpjData: CNPJResponse = await firstValueFrom(this.cnpjService.consultarCNPJ(cnpjLimpo));
      
      // Adiciona mensagem do usuário com CNPJ
      this.wizardState.addMessage({ 
        sender: 'user', 
        type: 'text', 
        content: cnpjData.cnpj 
      });

      // Salva dados da empresa (incluindo situacaoCadastral para uso posterior)
      this.wizardState.setEmpresaData({
        cnpj: cnpjData.cnpj,
        razaoSocial: cnpjData.razaoSocial,
        nomeFantasia: cnpjData.nomeFantasia,
        situacaoCadastral: cnpjData.situacaoCadastral
      });

      // Busca o setor completo pelo ID sugerido (com assistentes carregados)
      if (cnpjData.setorSugerido && cnpjData.setorSugerido.id) {
        try {
          // Primeiro tenta buscar o setor pelo ID com eagerload para garantir assistentes
          let setorCompleto: SetorDTO;
          
          try {
            setorCompleto = await firstValueFrom(
              this.setorService.getSetorById(cnpjData.setorSugerido.id, true)
            );
            console.log('Setor buscado pelo ID:', setorCompleto);
          } catch (error) {
            console.warn('Erro ao buscar setor pelo ID, tentando lista completa...', error);
            // Fallback: busca todos os setores
            const todosSetores: SetorDTO[] = await firstValueFrom(
              this.setorService.getAllSetors('id,asc', 0, 100, true)
            );
            const setorEncontrado = todosSetores.find(s => s.id === cnpjData.setorSugerido!.id);
            if (!setorEncontrado) {
              throw new Error(`Setor com ID ${cnpjData.setorSugerido.id} não encontrado`);
            }
            setorCompleto = setorEncontrado;
          }
          
          // Se ainda não tiver assistentes, tenta buscar da lista completa
          if (!setorCompleto.assistentes || setorCompleto.assistentes.length === 0) {
            console.log('Setor sem assistentes, buscando na lista completa com eagerload...');
            const todosSetores: SetorDTO[] = await firstValueFrom(
              this.setorService.getAllSetors('id,asc', 0, 100, true)
            );
            const setorDaLista = todosSetores.find(s => s.id === cnpjData.setorSugerido!.id);
            if (setorDaLista && setorDaLista.assistentes && setorDaLista.assistentes.length > 0) {
              setorCompleto = setorDaLista;
              console.log('✅ Setor encontrado na lista com assistentes!');
            }
          }
          
          // Verifica se o setor tem assistentes carregados
          console.log('Setor final:', {
            id: setorCompleto.id,
            nome: setorCompleto.nome,
            temAssistentes: !!setorCompleto.assistentes,
            quantidadeAssistentes: setorCompleto.assistentes?.length || 0,
            assistentes: setorCompleto.assistentes
          });
          
          if (!setorCompleto.assistentes || setorCompleto.assistentes.length === 0) {
            console.warn(`⚠️ Setor ${setorCompleto.nome} (ID: ${setorCompleto.id}) não possui assistentes vinculados na resposta da API.`);
            console.warn('Isso pode indicar que: 1) O setor realmente não tem assistentes no banco, ou 2) A API não está retornando os relacionamentos mesmo com eagerload.');
          } else {
            console.log(`✅ Setor ${setorCompleto.nome} encontrado com ${setorCompleto.assistentes.length} assistentes carregados.`);
          }
          
          // Se o setor não tiver assistentes carregados, busca separadamente
          if (!setorCompleto.assistentes || setorCompleto.assistentes.length === 0) {
            console.log('🔍 Setor sem assistentes na resposta. Buscando assistentes separadamente...');
            
            try {
              // Busca todos os assistentes com eagerload para ter os relacionamentos
              const todosAssistentes: any[] = await firstValueFrom(
                this.planoService.getAssistentes('id,asc')
              );
              
              console.log(`📋 Total de assistentes encontrados na API: ${todosAssistentes.length}`);
              
              // Inspeciona a estrutura de um assistente para entender o relacionamento
              if (todosAssistentes.length > 0) {
                console.log('🔬 Estrutura do primeiro assistente:', todosAssistentes[0]);
              }
              
              // Filtra assistentes que pertencem ao setor
              // O AssistenteDTO tem um campo 'setors' (array de SetorDTO)
              const assistentesDoSetor = todosAssistentes.filter((assistente: any) => {
                // Verifica se o array 'setors' do assistente contém o setor selecionado
                const temRelacao = assistente.setors?.some((s: any) => {
                  const setorId = typeof s === 'object' ? s.id : s;
                  return setorId === setorCompleto.id;
                }) || false;
                
                if (temRelacao) {
                  console.log(`✅ Assistente "${assistente.nome}" (ID: ${assistente.id}) pertence ao setor ${setorCompleto.nome}`);
                }
                
                return temRelacao;
              });
              
              console.log(`📊 Assistentes filtrados para o setor ${setorCompleto.nome}: ${assistentesDoSetor.length}`);
              
              // Atualiza o setor com os assistentes encontrados
              if (assistentesDoSetor.length > 0) {
                setorCompleto.assistentes = assistentesDoSetor.map(a => ({
                  id: a.id,
                  nome: a.nome,
                  descricao: a.descricao,
                  ativo: a.ativo !== false,
                  promptBase: a.promptBase,
                  modeloIA: a.modeloIA,
                  status: a.status
                }));
                console.log(`✅ ${assistentesDoSetor.length} assistentes vinculados ao setor ${setorCompleto.nome}`);
              } else {
                console.warn(`⚠️ Nenhum assistente encontrado vinculado ao setor ${setorCompleto.nome} (ID: ${setorCompleto.id})`);
                console.warn('💡 Possíveis causas:');
                console.warn('   1. O setor realmente não tem assistentes no banco');
                console.warn('   2. O relacionamento usa um campo diferente');
                console.warn('   3. Os assistentes precisam ser buscados de outra forma');
              }
            } catch (error) {
              console.error('❌ Erro ao buscar assistentes:', error);
            }
          }
          
          // Seleciona o setor automaticamente (com assistentes já carregados)
          this.wizardState.toggleSector(setorCompleto);
          
          // Aguarda um pouco para garantir que o signal seja atualizado
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Verifica novamente após atualizar o estado
          const setoresAposSelecao = this.wizardState.selectedSectors();
          const assistentesAposSelecao = this.wizardState.availableAssistants();
          
          console.log('=== VERIFICAÇÃO APÓS SELEÇÃO ===');
          console.log('Setores selecionados no estado:', setoresAposSelecao);
          console.log('Quantidade de setores:', setoresAposSelecao.length);
          setoresAposSelecao.forEach(setor => {
            console.log(`  - Setor: ${setor.nome} (ID: ${setor.id})`);
            console.log(`    Tem assistentes?: ${!!setor.assistentes}`);
            console.log(`    Quantidade assistentes: ${setor.assistentes?.length || 0}`);
            if (setor.assistentes && setor.assistentes.length > 0) {
              console.log(`    IDs dos assistentes:`, setor.assistentes.map(a => a.id));
            }
          });
          console.log('Assistentes disponíveis (computed):', assistentesAposSelecao);
          console.log('Quantidade assistentes disponíveis:', assistentesAposSelecao.length);
          
          this.tempCNPJ = '';
          this.scrollToBottom();

          // Mensagem da Eva confirmando a seleção
          setTimeout(() => {
            this.isTyping = false;
            const nomeEmpresa = cnpjData.nomeFantasia || cnpjData.razaoSocial;
            const nomeSetor = cnpjData.setorSugerido.nome;
            
            // Verifica novamente antes de mostrar a mensagem
            const assistentesFinais = this.wizardState.availableAssistants();
            
            if (assistentesFinais.length > 0) {
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
            } else {
              // Se não houver assistentes, volta para seleção manual de setores
              this.wizardState.addMessage({
                sender: 'eva',
                type: 'text',
                content: `Desculpe, <strong>${this.wizardState.userName()}</strong> 😔<br>Localizei a empresa <strong>${nomeEmpresa}</strong> e identifiquei o setor <strong>${nomeSetor}</strong>, mas não encontrei assistentes configurados para esse setor. Você pode selecionar outro setor manualmente?`
              });
              
              setTimeout(() => {
                // Carrega setores apenas quando for realmente para a seleção manual
                this.carregarSetores();
                this.wizardState.setCurrentStep(1);
                this.scrollToBottom();
              }, 2000);
            }
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
    this.carregarSetores(); // Carrega setores somente neste momento
    this.wizardState.setCurrentStep(1);
    this.scrollToBottom();
    setTimeout(() => {
      this.showEvaResponse(`Prazer, <strong>${this.wizardState.userName()}</strong>! 😉<br>Para eu entender melhor sua necessidade, em quais <strong>setores</strong> sua empresa precisa de reforço hoje?`);
    }, 500);
  }


  async nextStep() {
    if (!this.canProceedToNextStep() || this.isLoading) return;

    const step = this.currentStep();
    
    // Adiciona resposta do usuário (Resumo do passo atual)
    await this.addUserResponseSummary(step);

    // Lógica Específica de Transição
    if (step === 4) { // Infraestrutura -> Período (pulando Volume)
      // Define valores padrão de volume se não estiverem definidos
      if (this.monthlyCredits() <= 0) {
        this.wizardState.setMonthlyCredits(1000); // Valor padrão
      }
      if (this.tokensOpenAi() <= 0) {
        this.wizardState.setTokensOpenAi(1000000); // Valor padrão
      }
      
      // Executa simulação antes de ir para o passo de Período
      const sucesso = await this.simularPlano();
      if (!sucesso) return;
      
      // Pula direto para o Passo 6 (Período), pulando o Passo 5 (Volume)
      this.wizardState.setCurrentStep(6);
      this.scrollToBottom();
      this.triggerNextEvaQuestion(6);
      return;
    }

    if (step === 5) { // Volume -> Período (não deve mais acontecer, mas mantido como fallback)
      const sucesso = await this.simularPlano();
      if (!sucesso) return;
    }

    // Avança o passo
    this.wizardState.nextStep();
    this.scrollToBottom();

    // Salva dados de contato se tiver passado pelo passo 8
    if (step === 8) {
      this.wizardState.setUserEmail(this.tempEmail);
      if (this.tempPhone) this.wizardState.setUserPhone(this.tempPhone);
    }

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

  // Usuário concorda com o valor do orçamento após ver o resumo
  onConcordarResumo() {
    this.wizardState.addMessage({
      sender: 'user',
      type: 'text',
      content: 'Concordo com o valor do orçamento.'
    });
    this.scrollToBottom();

    // Vai para o passo de dados de contato e pergunta e-mail/telefone
    this.wizardState.setCurrentStep(8);
    this.showEvaResponse(
      `Perfeito, ${this.wizardState.userName()}! 🙌<br>` +
      `Agora me informe seu <strong>melhor e-mail</strong> e um <strong>WhatsApp</strong> para envio da proposta formal.`
    );
  }

  // Usuário quer alterar o orçamento após ver o resumo
  onAlterarResumo() {
    this.wizardState.addMessage({
      sender: 'user',
      type: 'text',
      content: 'Quero alterar o valor do orçamento.'
    });
    this.scrollToBottom();

    // Volta para os passos de configuração (por exemplo, período)
    this.wizardState.setCurrentStep(6); // Passo de período para ajustar valores
    this.showEvaResponse(
      `Sem problemas! 😉<br>` +
      `Você pode ajustar o <strong>período de contratação</strong> ou voltar e alterar os assistentes, canais e infraestrutura para recalcular o orçamento.`
    );
  }

  private async addUserResponseSummary(step: number) {
    let content = '';
    switch (step) {
      case 1: // Setores
        const setores = this.selectedSectors().map(s => s.nome).join(', ');
        content = `Preciso de ajuda em: ${setores}.`;
        break;
      case 2: // Assistentes
        // Busca os nomes dos assistentes da API para garantir que estão corretos
        const assistentesAtivos = this.assistants().filter(a => a.quantity > 0);
        if (assistentesAtivos.length > 0) {
          try {
            const assistentesCompletos = await firstValueFrom(
              this.planoService.getAssistentes('id,asc').pipe(catchError(() => of([])))
            );
            const assistentes = assistentesAtivos
              .map(a => {
                const assistenteCompleto = assistentesCompletos.find(ac => ac.id === a.id);
                const nome = assistenteCompleto?.nome && assistenteCompleto.nome.trim() !== '' 
                  ? assistenteCompleto.nome 
                  : (a.nome && a.nome.trim() !== '' ? a.nome : `Assistente #${a.id}`);
                return `${a.quantity}x ${nome}`;
              }).join(', ');
            content = `Vou precisar de: ${assistentes}.`;
          } catch (error) {
            // Fallback se a busca falhar
            const assistentes = assistentesAtivos
              .map(a => {
                const nome = a.nome && a.nome.trim() !== '' ? a.nome : `Assistente #${a.id}`;
                return `${a.quantity}x ${nome}`;
              }).join(', ');
            content = `Vou precisar de: ${assistentes}.`;
          }
        } else {
          content = 'Nenhum assistente selecionado.';
        }
        break;
      case 3: // Canais
         content = 'Canais configurados.';
         break;
      case 4: // Infra
        content = this.infrastructure() === 1001 ? 'Prefiro a nuvem compartilhada.' : 'Quero servidor dedicado.';
        break;
      case 5: // Volume (oculto - não deve aparecer)
        // Não adiciona mensagem do usuário, pois o passo está oculto
        break;
      case 6: // Período
        content = `Prefiro o plano ${this.selectedPeriod()}.`;
        break;
    }

    if (content) {
      this.wizardState.addMessage({ sender: 'user', type: 'text', content });
    }
  }

  private async triggerNextEvaQuestion(nextStep: number) {
    this.isTyping = true;
    this.scrollToBottom();

    setTimeout(async () => {
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
        case 5: // Volume (oculto - não deve aparecer)
          message = 'Estamos quase lá! 📈<br>Qual é a sua estimativa de <strong>conversas por mês</strong>?';
          break;
        case 6: // Infra -> Período (pulando Volume, com Simulação já executada)
          message = `Perfeito, ${this.wizardState.userName()}! 🧮<br>Já calculei tudo aqui. Escolha o <strong>período de contratação</strong> para ver os descontos que consegui para você.`;
          break;
        case 7: // Período -> Resumo
          // Gera o resumo completo como HTML para exibir no chat
          message = await this.gerarResumoCompleto();
          break;
      }

      if (message) {
        this.wizardState.addMessage({ sender: 'eva', type: 'text', content: message });
        this.scrollToBottom();
      }
    }, 1500);
  }

  private async gerarResumoCompleto(): Promise<string> {
    // Busca dados necessários para o resumo
    const [periodos, infraestruturas, assistentes, canals] = await Promise.all([
      firstValueFrom(this.planoService.getPeriodosContratacao('id,asc').pipe(catchError(() => of([])))),
      firstValueFrom(this.planoService.getInfraestruturas('id,asc').pipe(catchError(() => of([])))),
      firstValueFrom(this.planoService.getAssistentes('id,asc').pipe(catchError(() => of([])))),
      firstValueFrom(this.planoService.getCanals('id,asc').pipe(catchError(() => of([]))))
    ]);

    const baseMensal = this.wizardState.baseMonthlyValue() ?? 0;
    const valorSetup = this.resultadoSimulacao?.valorSetupTotal ?? 0;
    const periodoCodigo = this.selectedPeriod();
    const periodo = periodos.find(p => p.codigo === periodoCodigo && p.ativo);

    // Calcula valores do período
    let htmlResumo = '<div style="text-align: left; font-size: 0.95rem;">';
    htmlResumo += '<strong style="font-size: 1.1rem; display: block; margin-bottom: 16px;">📋 Resumo do Plano</strong>';
    
    // Destaque para Valores Mensal e Setup
    htmlResumo += '<div style="background: linear-gradient(135deg, rgba(0, 152, 218, 0.15) 0%, rgba(0, 152, 218, 0.05) 100%); padding: 16px; border-radius: 12px; margin-bottom: 16px; border: 2px solid #0098da; box-shadow: 0 4px 12px rgba(0, 152, 218, 0.2);">';
    htmlResumo += '<div style="display: flex; flex-direction: column; gap: 12px;">';
    
    // Valor Mensal em destaque
    htmlResumo += '<div style="background: rgba(0, 152, 218, 0.2); padding: 12px; border-radius: 8px; border-left: 4px solid #0098da;">';
    htmlResumo += '<div style="font-size: 0.85rem; color: #0098da; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">💵 Valor Mensal</div>';
    
    if (periodo && baseMensal > 0) {
      const meses = periodo.meses || 1;
      const precoPeriodoBruto = baseMensal * meses;
      
      let valorDesconto = 0;
      if (periodo.tipoDesconto === 'PERCENTUAL') {
        valorDesconto = precoPeriodoBruto * (periodo.valorDesconto / 100);
      } else if (periodo.tipoDesconto === 'VALOR_FIXO') {
        valorDesconto = periodo.valorDesconto;
      }
      
      const precoPeriodoComDesconto = Math.max(precoPeriodoBruto - valorDesconto, 0);
      const precoMensalComDesconto = precoPeriodoComDesconto / meses;
      
      const periodoLabels: { [key: string]: string } = {
        MENSAL: 'Mensal',
        TRIMESTRAL: 'Trimestral',
        SEMESTRAL: 'Semestral',
        ANUAL: 'Anual',
      };
      
      htmlResumo += `<div style="font-size: 1.5rem; font-weight: bold; color: #0098da; margin: 4px 0; text-shadow: 0 2px 4px rgba(0, 152, 218, 0.3);">${this.formatarMoeda(precoMensalComDesconto)} <span style="font-size: 0.9rem; font-weight: 500;">/ mês</span></div>`;
      htmlResumo += `<div style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.7); margin-top: 2px;">Período: ${periodoLabels[periodoCodigo!] || periodoCodigo} (${meses} meses) - Total: ${this.formatarMoeda(precoPeriodoComDesconto)}</div>`;
      if (valorDesconto > 0) {
        htmlResumo += `<div style="font-size: 0.75rem; color: #4caf50; margin-top: 4px; font-weight: 600;">✨ Desconto de ${periodo.tipoDesconto === 'PERCENTUAL' ? periodo.valorDesconto + '%' : this.formatarMoeda(periodo.valorDesconto)} aplicado!</div>`;
      }
    } else {
      htmlResumo += `<div style="font-size: 1.5rem; font-weight: bold; color: #0098da; margin: 4px 0; text-shadow: 0 2px 4px rgba(0, 152, 218, 0.3);">${this.formatarMoeda(baseMensal)} <span style="font-size: 0.9rem; font-weight: 500;">/ mês</span></div>`;
    }
    htmlResumo += '</div>';
    
    // Valor Setup em destaque
    if (valorSetup > 0) {
      htmlResumo += '<div style="background: rgba(255, 193, 7, 0.2); padding: 12px; border-radius: 8px; border-left: 4px solid #ffc107;">';
      htmlResumo += '<div style="font-size: 0.85rem; color: #ffc107; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">🔧 Valor Setup (Inicial)</div>';
      htmlResumo += `<div style="font-size: 1.5rem; font-weight: bold; color: #ffc107; margin: 4px 0; text-shadow: 0 2px 4px rgba(255, 193, 7, 0.3);">${this.formatarMoeda(valorSetup)}</div>`;
      htmlResumo += '<div style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.7); margin-top: 2px;">Valor único pago no início</div>';
      htmlResumo += '</div>';
    }
    
    htmlResumo += '</div>'; // fecha flex container
    htmlResumo += '</div>'; // fecha destaque principal

    // Configuração do plano
    htmlResumo += '<div style="margin-top: 16px;">';
    htmlResumo += '<strong style="display: block; margin-bottom: 8px; color: #fff;">⚙️ Configuração:</strong>';
    
    // Setores
    const setoresSelecionados = this.selectedSectors();
    if (setoresSelecionados.length > 0) {
      htmlResumo += `<div style="margin-bottom: 8px;"><strong>Setores:</strong> ${setoresSelecionados.map(s => s.nome).join(', ')}</div>`;
    }
    
    // Assistentes
    const assistentesAtivos = this.assistants().filter(a => a.quantity > 0);
    if (assistentesAtivos.length > 0) {
      htmlResumo += '<div style="margin-bottom: 8px;"><strong>Assistentes:</strong><br>';
      assistentesAtivos.forEach(a => {
        const nome = assistentes.find(ast => ast.id === a.id)?.nome || `Assistente #${a.id}`;
        htmlResumo += `&nbsp;&nbsp;• ${nome} (${a.quantity}x) - ${a.sector}<br>`;
      });
      htmlResumo += '</div>';
    }
    
    // Canais
    const canaisAtivos = this.channels().filter(c => c.enabled);
    if (canaisAtivos.length > 0) {
      htmlResumo += '<div style="margin-bottom: 8px;"><strong>Canais:</strong> ';
      const nomesCanais = canaisAtivos.map(c => {
        const nome = canals.find(can => can.id === c.id)?.nome || `Canal #${c.id}`;
        return nome;
      });
      htmlResumo += nomesCanais.join(', ') + '</div>';
    }
    
    // Infraestrutura
    if (this.infrastructure()) {
      const infraNome = infraestruturas.find(i => i.id === this.infrastructure())?.nome || `Infraestrutura #${this.infrastructure()}`;
      htmlResumo += `<div style="margin-bottom: 8px;"><strong>Infraestrutura:</strong> ${infraNome}</div>`;
    }
    
    // Consumo
    htmlResumo += '<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">';
    htmlResumo += `<div><strong>📊 Consumo estimado:</strong></div>`;
    htmlResumo += `<div>&nbsp;&nbsp;• Mensagens: ${this.formatarNumero(this.monthlyCredits())} / mês</div>`;
    htmlResumo += `<div>&nbsp;&nbsp;• Tokens OpenAI: ${this.formatarNumero(this.tokensOpenAi())} / mês</div>`;
    htmlResumo += '</div>';
    
    htmlResumo += '</div>';
    htmlResumo += '</div>';
    
    return 'Prontinho! 🎉<br><br>' + htmlResumo;
  }

  private formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  }

  private formatarNumero(valor: number): string {
    if (valor >= 1000000) {
      return `${(valor / 1000000).toFixed(1)}M`;
    } else if (valor >= 1000) {
      return `${(valor / 1000).toFixed(0)}k`;
    }
    return valor.toString();
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

  async carregarOrcamentoParaEdicao(hash: string) {
    const loading = await this.loadingController.create({
      message: 'Carregando proposta para edição...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Busca o orçamento com itens
      const data = await firstValueFrom(
        this.orcamentoService.getByHashComItens(hash).pipe(
          catchError(async (error) => {
            // Fallback: tenta buscar pelo hash normal
            const orcamento = await firstValueFrom(
              this.orcamentoService.getByHash(hash).pipe(catchError(() => of(null)))
            );
            if (orcamento && orcamento.id) {
              const dataComItens = await firstValueFrom(
                this.orcamentoService.getByIdComItens(orcamento.id).pipe(catchError(() => of({ orcamento, itens: [] })))
              );
              return dataComItens;
            }
            throw error;
          })
        )
      );

      loading.dismiss();

      if (!data || !data.orcamento) {
        this.showToast('Orçamento não encontrado.', 'danger');
        this.router.navigate(['/wizard']);
        return;
      }

      const orcamento = data.orcamento;
      const itens = data.itens || [];

      console.log('📦 Orçamento carregado para edição:', orcamento);
      console.log('📋 Itens do orçamento:', itens);

      // Restaura nome do usuário
      if (orcamento.nomeProspect) {
        this.wizardState.setUserName(orcamento.nomeProspect);
        this.tempName = orcamento.nomeProspect;
      }

      // Restaura email e telefone
      if (orcamento.emailProspect) {
        this.tempEmail = orcamento.emailProspect;
      }
      if (orcamento.telefoneProspect) {
        this.tempPhone = orcamento.telefoneProspect;
      }

      // Restaura dados da empresa se disponível
      if (orcamento.empresaDadosCnpj) {
        this.wizardState.setEmpresaData({
          cnpj: orcamento.empresaDadosCnpj.cnpj,
          razaoSocial: orcamento.empresaDadosCnpj.razaoSocial,
          nomeFantasia: orcamento.empresaDadosCnpj.nomeFantasia,
          situacaoCadastral: orcamento.empresaDadosCnpj.situacaoCadastral
        });
      }

      // Salva o hash para uso posterior
      this.orcamentoFinalizadoHash = hash;

      // Mapeia itens para o estado (restaura setores, assistentes, canais, infraestrutura)
      await this.mapearItensParaEstado(itens);

      // Restaura infraestrutura (se não foi mapeada pelos itens)
      if (orcamento.infraestrutura?.id && !this.wizardState.infrastructure()) {
        this.wizardState.setInfrastructure(orcamento.infraestrutura.id);
      }

      // Restaura período se houver (precisa calcular baseado no desconto)
      // Por enquanto, vamos apenas restaurar o valor base
      if (orcamento.valorTotalFechado) {
        this.wizardState.setBaseMonthlyValue(orcamento.valorTotalTabela || orcamento.valorTotalFechado);
      }

      // Inicia o chat com mensagem de boas-vindas para edição
      this.wizardState.setUserName(orcamento.nomeProspect || 'Cliente');
      
      // Define o passo inicial baseado no que foi restaurado
      // Se já tem setores, vai para assistentes; se já tem assistentes, vai para canais, etc
      let stepInicial = 1; // Padrão: seleção de setores
      if (this.wizardState.selectedSectors().length > 0) {
        stepInicial = 2; // Já tem setores, vai para assistentes
        if (this.wizardState.assistants().filter(a => a.quantity > 0).length > 0) {
          stepInicial = 3; // Já tem assistentes, vai para canais
          if (this.wizardState.channels().filter(c => c.enabled).length > 0) {
            stepInicial = 4; // Já tem canais, vai para infraestrutura
            if (this.wizardState.infrastructure()) {
              stepInicial = 6; // Já tem tudo, vai para período
            }
          }
        }
      }
      
      this.wizardState.setCurrentStep(stepInicial);

      // Adiciona mensagem inicial
      this.wizardState.addMessage({
        sender: 'eva',
        type: 'text',
        content: `Olá novamente, <strong>${orcamento.nomeProspect || 'Cliente'}</strong>! 👋<br>Carreguei sua proposta anterior. Você pode revisar e editar os itens abaixo.`
      });

      this.scrollToBottom();
      this.showToast('Proposta carregada. Você pode editar os itens.', 'success');

    } catch (error: any) {
      loading.dismiss();
      console.error('❌ Erro ao carregar orçamento para edição:', error);
      this.showToast('Erro ao carregar proposta. Tente novamente.', 'danger');
      this.router.navigate(['/wizard']);
    }
  }

  private async mapearItensParaEstado(itens: ItemOrcamentoDTO[]) {
    // Busca todos os setores e assistentes para mapear corretamente
    const [setores, assistentes, canals] = await Promise.all([
      firstValueFrom(this.setorService.getAllSetors('id,asc', 0, 100, true).pipe(catchError(() => of([])))),
      firstValueFrom(this.planoService.getAssistentes('id,asc').pipe(catchError(() => of([])))),
      firstValueFrom(this.planoService.getCanals('id,asc').pipe(catchError(() => of([]))))
    ]);

    const setoresSelecionados: SetorDTO[] = [];
    const assistentesEstado: { id: number; nome: string; quantity: number; sector: string }[] = [];
    const canaisEstado: { id: number; nome: string; enabled: boolean }[] = [];
    const assistantChannels: { assistantId: number; channelId: number; enabled: boolean }[] = [];

    // Processa cada item
    for (const item of itens) {
      if (item.tipoItem === 'INFRAESTRUTURA') {
        // Restaura infraestrutura diretamente
        if (item.referenciaId) {
          this.wizardState.setInfrastructure(item.referenciaId);
        }
        continue;
      }

      if (item.tipoItem === 'ASSISTENTE') {
        const assistente: any = assistentes.find(a => a.id === item.referenciaId);
        if (assistente) {
          // Busca os setores do assistente (a API retorna com 'setors')
          const setoresDoAssistente = (assistente.setors || assistente.setores || []) as any[];
          setoresDoAssistente.forEach((setorRef: any) => {
            const setorId = typeof setorRef === 'object' ? setorRef.id : setorRef;
            const setorCompleto = setores.find(s => s.id === setorId);
            if (setorCompleto && !setoresSelecionados.find(s => s.id === setorCompleto.id)) {
              setoresSelecionados.push(setorCompleto);
            }
          });

          // Adiciona assistente ao estado
          const setorNome = setoresDoAssistente.length > 0 
            ? (typeof setoresDoAssistente[0] === 'object' ? setoresDoAssistente[0].nome : 'Geral')
            : 'Geral';
          
          assistentesEstado.push({
            id: assistente.id,
            nome: assistente.nome || `Assistente #${assistente.id}`,
            quantity: item.quantidade,
            sector: setorNome
          });
        }
      }

      if (item.tipoItem === 'CANAL') {
        const canal = canals.find(c => c.id === item.referenciaId);
        if (canal) {
          canaisEstado.push({
            id: canal.id,
            nome: canal.nome || `Canal #${canal.id}`,
            enabled: true
          });

          // Associa canais aos assistentes (todos os assistentes ativos recebem o canal)
          assistentesEstado.forEach(assistente => {
            assistantChannels.push({
              assistantId: assistente.id,
              channelId: canal.id,
              enabled: true
            });
          });
        }
      }
    }

    // Atualiza o estado do wizard
    setoresSelecionados.forEach(setor => {
      this.wizardState.toggleSector(setor);
    });

    this.wizardState.setAssistants(assistentesEstado);
    this.wizardState.setChannels(canaisEstado);
    this.wizardState.setAssistantChannels(assistantChannels);

    console.log('✅ Estado restaurado:', {
      setores: setoresSelecionados.length,
      assistentes: assistentesEstado.length,
      canais: canaisEstado.length
    });
  }

  verPropostaCompleta() {
    const hash = this.orcamentoFinalizadoHash;
    if (hash) {
      this.router.navigate(['/resultado-orcamento'], { queryParams: { hash } });
    } else {
      this.showToast('Hash da proposta não encontrado.', 'warning');
    }
  }

  // --- Lógica de Negócio ---

  async finalizarOrcamento() {
    console.log('🚀 Iniciando finalizarOrcamento...');
    
    // Garante que os dados de contato estão no estado para salvamento no Firebase
    if (this.tempEmail) this.wizardState.setUserEmail(this.tempEmail);
    if (this.tempPhone) this.wizardState.setUserPhone(this.tempPhone);

    console.log('📊 Estado atual:', {
      resultadoSimulacao: !!this.resultadoSimulacao,
      selectedPeriod: this.selectedPeriod(),
      tempEmail: this.tempEmail,
      tempPhone: this.tempPhone,
      userName: this.wizardState.userName()
    });

    // Verificação e recuperação automática da simulação se necessário
    if (!this.resultadoSimulacao && this.wizardState.infrastructure()) {
      console.log('🔄 Simulação ausente na finalização. Tentando recalcular...');
      const sucesso = await this.simularPlano();
      if (!sucesso) {
        console.error('❌ Falha ao recalcular simulação.');
      } else {
        console.log('✅ Simulação recalculada com sucesso!');
      }
    }

    if (!this.resultadoSimulacao || !this.selectedPeriod()) {
      console.warn('⚠️ Simulação incompleta mesmo após tentativa de recálculo');
      this.showToast('Não foi possível gerar a proposta. Por favor, revise as configurações.', 'warning');
      this.isTyping = false; // Restaura UI em caso de erro
      return;
    }

    const leadData: LeadData = {
      nome: this.wizardState.userName(),
      email: this.tempEmail,
      telefone: this.tempPhone
    };

    console.log('📝 LeadData:', leadData);

    try {
      this.isLoading = true;
      
      // Busca dados necessários
      const periodoCodigo = this.selectedPeriod();
      console.log('🔍 Buscando período:', periodoCodigo);
      let periodoData: PeriodoContratacao | null = null;

      if (periodoCodigo) {
        const periodos = await firstValueFrom(this.planoService.getPeriodosContratacao('id,asc').pipe(catchError((err) => {
          console.error('❌ Erro ao buscar períodos:', err);
          return of([]);
        })));
        periodoData = periodos?.find(p => p.codigo === periodoCodigo && p.ativo) || null;
        console.log('📅 Período encontrado:', periodoData);
      }

      console.log('👤 Buscando vendedores...');
      const vendedors = await firstValueFrom(this.planoService.getVendedors('id,asc', 0, 100).pipe(catchError((err) => {
        console.error('❌ Erro ao buscar vendedores:', err);
        return of([]);
      })));
      console.log('👥 Vendedores encontrados:', vendedors.length);
      const vendedorId = vendedors?.find(v => v.tipo === 'SISTEMA_IA')?.id;
      console.log('✅ Vendedor ID:', vendedorId);

      if (!vendedorId) {
        console.error('❌ Vendedor sistema não encontrado');
        throw new Error('Vendedor sistema não encontrado');
      }

      console.log('🔄 Convertendo para OrcamentoDTO...');
      const orcamentoDTO = this.converterParaOrcamentoDTO(leadData, periodoData, vendedorId);
      console.log('✅ OrcamentoDTO criado:', JSON.stringify(orcamentoDTO, null, 2));

      // Envia para API
      console.log('📤 Enviando orçamento para API...');
      this.orcamentoService.create(orcamentoDTO)
        .pipe(
          finalize(() => {
            this.isLoading = false;
            console.log('🏁 Finalize chamado');
            // Mantém isTyping como true por enquanto, pois vamos tratar no subscribe ou no timeout
          })
        )
        .subscribe({
          next: async (orcamento) => {
            console.log('✅ Resposta da API recebida:', orcamento);
            if (orcamento.codigoHash) {
              // Sucesso direto
              console.log('✅ Hash presente, sucesso direto!');
              this.handleSuccess(orcamento);
            } else if (orcamento.id) {
              // Fallback: Tenta buscar pelo ID se o hash vier nulo na criação
              console.warn('⚠️ Hash nulo na criação. Tentando buscar pelo ID:', orcamento.id);
              try {
                const orcamentoCompleto = await firstValueFrom(this.orcamentoService.getById(orcamento.id!));
                console.log('📥 Orçamento completo buscado:', orcamentoCompleto);
                if (orcamentoCompleto && orcamentoCompleto.codigoHash) {
                  this.handleSuccess(orcamentoCompleto);
                } else {
                  console.error('❌ Hash não encontrado mesmo após busca');
                  this.handleError(new Error('Hash não gerado mesmo após nova busca.'));
                }
              } catch (e) {
                console.error('❌ Erro ao buscar orçamento pelo ID:', e);
                this.handleError(e);
              }
            } else {
              console.error('❌ Orçamento criado sem ID nem Hash:', orcamento);
              this.handleError(new Error('Orçamento criado sem ID nem Hash.'));
            }
          },
          error: (err) => {
            console.error('❌ Erro no subscribe:', err);
            this.handleError(err);
          }
        });

    } catch (e) {
      console.error('❌ Erro no try/catch:', e);
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
    console.error('❌ Erro na finalização:', err);
    console.error('Detalhes do erro:', {
      message: err?.message,
      error: err?.error,
      status: err?.status,
      statusText: err?.statusText,
      url: err?.url,
      fullError: err
    });
    this.isTyping = false; // Garante que destrava
    this.isLoading = false;
    
    // Mensagem de erro mais específica
    let errorMessage = 'Erro ao gerar proposta. Tente novamente.';
    if (err?.error?.message) {
      errorMessage = `Erro: ${err.error.message}`;
    } else if (err?.message) {
      errorMessage = `Erro: ${err.message}`;
    }
    
    this.showToast(errorMessage, 'danger');
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
    this.setorService.getAllSetors('id,asc', 0, 100, true).subscribe({
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
      case 5: return true; // Passo oculto, sempre permite avançar
      case 6: return this.selectedPeriod() !== null;
      case 7: return true;
      case 8: return this.isValidEmail(this.tempEmail);
      default: return false;
    }
  }

  isValidEmail(email: string): boolean {
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

    // Adiciona empresaDadosCnpj se disponível
    const empresaData = this.wizardState.empresaData();
    if (empresaData) {
      orcamento.empresaDadosCnpj = {
        cnpj: empresaData.cnpj,
        razaoSocial: empresaData.razaoSocial,
        nomeFantasia: empresaData.nomeFantasia,
        situacaoCadastral: empresaData.situacaoCadastral || 'ATIVA',
        emailFinanceiro: leadData?.email || '' // Usa o email do prospect como email financeiro
      };
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

}
