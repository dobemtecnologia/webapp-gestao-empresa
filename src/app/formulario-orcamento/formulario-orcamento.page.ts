import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LoadingController, ToastController, MenuController } from '@ionic/angular';
import { firstValueFrom, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

import { PlanoService } from '../services/plano.service';
import { OrcamentoService } from '../services/orcamento.service';
import { SetorService } from '../services/setor.service';
import { CnpjService } from '../services/cnpj.service';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';

import { PlanoSimulacaoResponse } from '../models/plano-simulacao-response.model';
import { OrcamentoDTO, ItemOrcamentoDTO, LeadData } from '../models/orcamento.model';
import { PeriodoContratacao } from '../models/periodo-contratacao.model';
import { LoginVM } from '../models/login-vm.model';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-formulario-orcamento',
  templateUrl: './formulario-orcamento.page.html',
  styleUrls: ['./formulario-orcamento.page.scss'],
  standalone: false,
})
export class FormularioOrcamentoPage implements OnInit {
  formulario!: FormGroup;
  currentStep = 1; // 1: Cliente, 2: Assistentes, 3: Cálculo Plano, 4: Revisão
  totalSteps = 4;

  // Estado do formulário
  resultadoSimulacao?: PlanoSimulacaoResponse;
  isLoading = false;
  isEditingMode = false;
  orcamentoId?: number;
  orcamentoHash?: string;
  orcamentoConfirmado = false;
  propostaGerada = false;
  hashProposta?: string;

  // Serviços
  private fb = inject(FormBuilder);
  router = inject(Router);
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
  private cdr = inject(ChangeDetectorRef);

  async ngOnInit() {
    this.menuController.enable(false);
    this.loginAutomatico();
    this.inicializarFormulario();
    
    // Verificar se há hash na URL antes de preencher dados mock
    const params = await firstValueFrom(this.route.queryParams);
    const hash = params['hash'];
    
    // Só preenche dados mock se não houver hash (não está carregando orçamento existente)
    if (!hash) {
      this.preencherDadosMockEmDev();
    }
    
    await this.verificarModoEdicao();
    
    // Atualizar validação quando o formulário mudar
    this.formulario.valueChanges.subscribe(() => {
      // Força a detecção de mudanças para atualizar o estado do botão
      this.cdr.detectChanges();
    });
  }

  private async loginAutomatico(): Promise<void> {
    if (this.authService.isAuthenticated()) return;
    const credentials: LoginVM = { username: 'admin', password: 'admin', rememberMe: false };
    try {
      await firstValueFrom(this.authService.login(credentials).pipe(catchError(() => of(null))));
    } catch (e) { 
      console.error(e); 
    }
  }

  private inicializarFormulario() {
    this.formulario = this.fb.group({
      // Dados do Cliente
      nome: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      telefone: [''],
      cnpj: [''],
      empresaData: this.fb.group({
        cnpj: [''],
        razaoSocial: [''],
        nomeFantasia: [''],
        situacaoCadastral: ['']
      }),

      // Configuração do Plano
      setores: [[], [Validators.required, this.validarArrayNaoVazio]],
      assistentes: [[]],
      canais: [[]],
      assistantChannels: [[]],
      infrastructure: [null, Validators.required],
      monthlyCredits: [1000],
      tokensOpenAi: [1000000],
      selectedPeriod: [null, Validators.required],

      // Resultado da simulação (não editável)
      resultadoSimulacao: [null]
    });
  }

  private preencherDadosMockEmDev() {
    // Preenche dados mockados apenas em ambiente de desenvolvimento (localhost)
    if (!environment.production && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      const dadosMock = {
        nome: 'Elton Gonçalves',
        email: 'elton.jd.goncalves@gmail.com',
        telefone: '91983538941',
        cnpj: '46418343000171'
      };

      // Formata o CNPJ (XX.XXX.XXX/XXXX-XX)
      const cnpjFormatado = dadosMock.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      
      // Formata o telefone ((XX) XXXXX-XXXX)
      const telefoneFormatado = dadosMock.telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');

      // Preenche os campos do formulário
      this.formulario.patchValue({
        nome: dadosMock.nome,
        email: dadosMock.email,
        telefone: telefoneFormatado,
        cnpj: cnpjFormatado
      });

      // Força a detecção de mudanças
      this.cdr.detectChanges();
    }
  }

  private validarArrayNaoVazio(control: any) {
    const value = control.value;
    if (!value || !Array.isArray(value) || value.length === 0) {
      return { arrayVazio: true };
    }
    return null;
  }

  private async verificarModoEdicao() {
    const params = await firstValueFrom(this.route.queryParams);
    const hash = params['hash'];
    const action = params['action'];

    // Carrega o orçamento se houver hash (com ou sem action=edit)
    if (hash) {
      this.isEditingMode = action === 'edit';
      await this.carregarOrcamentoParaEdicao(hash);
    }
  }

  private async carregarOrcamentoParaEdicao(hash: string) {
    const loading = await this.loadingController.create({
      message: 'Carregando proposta para edição...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const data = await firstValueFrom(
        this.orcamentoService.getByHashComItens(hash).pipe(
          catchError(async (error) => {
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

      if (!data || !data.orcamento) {
        this.showToast('Orçamento não encontrado.', 'danger');
        this.router.navigate(['/formulario-orcamento']);
        return;
      }

      const orcamento = data.orcamento;
      const itens = data.itens || [];

      // Preencher formulário com dados do orçamento
      this.formulario.patchValue({
        nome: orcamento.nomeProspect || '',
        email: orcamento.emailProspect || '',
        telefone: orcamento.telefoneProspect || '',
        infrastructure: orcamento.infraestrutura?.id || null
      });

      // Buscar período baseado no desconto aplicado
      const percentualDesconto = orcamento.percentualDescontoAplicado || 0;
      const periodos = await firstValueFrom(
        this.planoService.getPeriodosContratacao('id,asc').pipe(catchError(() => of([])))
      );
      
      let periodoEncontrado = null;
      
      if (percentualDesconto > 0) {
        // Busca período com desconto percentual
        periodoEncontrado = periodos.find(p => 
          p.ativo && 
          p.tipoDesconto === 'PERCENTUAL' && 
          Math.abs(p.valorDesconto - percentualDesconto) < 0.01
        );
      } else {
        // Se não há desconto, busca o período mensal (geralmente o primeiro ou com 1 mês)
        periodoEncontrado = periodos.find(p => 
          p.ativo && 
          (p.meses === 1 || p.codigo === 'MENSAL' || p.nome?.toUpperCase().includes('MENSAL'))
        );
      }
      
      if (periodoEncontrado) {
        // Define o período no formulário
        this.formulario.patchValue({ selectedPeriod: periodoEncontrado.codigo });
        
        // Força a detecção de mudanças imediatamente
        this.cdr.detectChanges();
        
        // Aguarda um ciclo para garantir que o componente de período foi atualizado
        setTimeout(() => {
          this.onPeriodoChange(periodoEncontrado!.codigo);
          this.cdr.detectChanges();
        }, 200);
      } else {
        console.warn('Período não encontrado para desconto:', percentualDesconto);
      }

      // Preencher dados da empresa (pode vir em empresa ou empresaDadosCnpj)
      // A API pode retornar empresa com campos completos ou apenas empresaDadosCnpj
      const empresa = orcamento.empresa as any;
      const empresaDadosCnpj = orcamento.empresaDadosCnpj;
      
      // Verifica se tem CNPJ em empresa ou empresaDadosCnpj
      const cnpjOriginal = (empresa?.cnpj || empresaDadosCnpj?.cnpj) as string | undefined;
      
      if (cnpjOriginal) {
        // Formatar CNPJ se necessário (pode vir sem formatação)
        const cnpjLimpo = cnpjOriginal.replace(/\D/g, '');
        let cnpjFormatado = cnpjOriginal;
        
        // Se o CNPJ não estiver formatado, formatar
        if (cnpjLimpo.length === 14) {
          if (!cnpjFormatado.includes('.')) {
            cnpjFormatado = cnpjLimpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
          }
        }
        
        // Preencher CNPJ formatado no campo principal e nos dados da empresa
        this.formulario.patchValue({
          cnpj: cnpjFormatado,
          empresaData: {
            cnpj: cnpjOriginal, // Mantém o CNPJ original (sem formatação) nos dados da empresa
            razaoSocial: empresa?.razaoSocial || empresaDadosCnpj?.razaoSocial || '',
            nomeFantasia: empresa?.nomeFantasia || empresaDadosCnpj?.nomeFantasia || '',
            situacaoCadastral: empresa?.status || empresaDadosCnpj?.situacaoCadastral || 'ATIVA'
          }
        });
        
        // Força a detecção de mudanças para atualizar a UI
        this.cdr.detectChanges();
      }

      this.orcamentoId = orcamento.id;
      this.orcamentoHash = orcamento.codigoHash || hash;

      // Mapear itens para o formulário
      await this.mapearItensParaFormulario(itens);

      // Executar simulação para atualizar valores
      await this.executarSimulacao();

      loading.dismiss();
      this.showToast('Proposta carregada. Você pode editar os itens.', 'success');

    } catch (error: any) {
      loading.dismiss();
      console.error('❌ Erro ao carregar orçamento para edição:', error);
      this.showToast('Erro ao carregar proposta. Tente novamente.', 'danger');
      this.router.navigate(['/formulario-orcamento']);
    }
  }

  private async mapearItensParaFormulario(itens: ItemOrcamentoDTO[]) {
    try {
      // Separar itens por tipo
      const itensInfraestrutura = itens.filter(i => i.tipoItem === 'INFRAESTRUTURA');
      const itensAssistentes = itens.filter(i => i.tipoItem === 'ASSISTENTE');
      const itensCanais = itens.filter(i => i.tipoItem === 'CANAL');

      // Mapear infraestrutura
      if (itensInfraestrutura.length > 0) {
        const infraId = itensInfraestrutura[0].referenciaId;
        this.formulario.patchValue({ infrastructure: infraId });
      }

      let assistentesFormatados: any[] = [];
      let setoresFormatados: any[] = [];

      // Mapear setores e assistentes
      if (itensAssistentes.length > 0) {
        const assistentesIds = new Set<number>();
        const setoresIds = new Set<number>();

        // Coletar IDs dos assistentes
        itensAssistentes.forEach(item => assistentesIds.add(item.referenciaId));

        // Buscar detalhes dos assistentes para obter os setores
        const assistentes = await firstValueFrom(
          this.planoService.getAssistentes('id,asc', true).pipe(catchError(() => of([])))
        );

        const assistentesSelecionados = assistentes.filter((a: any) => assistentesIds.has(a.id));
        
        // Extrair setores dos assistentes
        assistentesSelecionados.forEach((assistente: any) => {
          const setoresDoAssistente = assistente.setors || assistente.setores || [];
          setoresDoAssistente.forEach((setor: any) => {
            const setorId = typeof setor === 'object' ? setor.id : setor;
            if (setorId) setoresIds.add(setorId);
          });
        });

        // Buscar setores completos
        if (setoresIds.size > 0) {
          const setores = await firstValueFrom(
            this.setorService.getAllSetors('id,asc', 0, 100, true).pipe(catchError(() => of([])))
          );
          const setoresSelecionados = setores.filter((s: any) => setoresIds.has(s.id));
          
          // Buscar assistentes por setores para ter a estrutura completa
          const setoresComAssistentes = await Promise.all(
            Array.from(setoresIds).map(async (setorId) => {
              const assistentesDoSetor = await firstValueFrom(
                this.planoService.getAssistentesPorSetores([setorId]).pipe(catchError(() => of([])))
              );
              return {
                id: setorId,
                assistentes: assistentesDoSetor.filter((a: any) => assistentesIds.has(a.id))
              };
            })
          );

          // Mapear setores com assistentes
          setoresFormatados = setoresSelecionados.map((setor: any) => {
            const setorComAssistentes = setoresComAssistentes.find(s => s.id === setor.id);
            return {
              ...setor,
              assistentes: setorComAssistentes?.assistentes || []
            };
          });

          this.formulario.patchValue({ setores: setoresFormatados });

          // Mapear assistentes com quantidades
          assistentesFormatados = itensAssistentes.map(item => {
            const assistente = assistentesSelecionados.find((a: any) => a.id === item.referenciaId);
            const setorDoAssistente = setoresFormatados.find(s => 
              s.assistentes?.some((a: any) => a.id === item.referenciaId)
            );
            
            return {
              id: item.referenciaId,
              nome: assistente?.nome || `Assistente ${item.referenciaId}`,
              quantity: item.quantidade || 0,
              sector: setorDoAssistente?.nome || 'Setor'
            };
          });

          this.formulario.patchValue({ assistentes: assistentesFormatados });
        }
      }

      // Mapear canais
      if (itensCanais.length > 0 && assistentesFormatados.length > 0) {
        const canais = await firstValueFrom(
          this.planoService.getCanals('id,asc').pipe(catchError(() => of([])))
        );

        const canaisFormatados = canais.map((canal: any) => ({
          id: canal.id,
          nome: canal.nome
        }));

        // Mapear assistantChannels baseado nos canais e assistentes
        const assistantChannels: Array<{ assistantId: number; channelId: number; enabled: boolean }> = [];
        const canaisIds = new Set(itensCanais.map(i => i.referenciaId));
        
        // Para cada assistente ativo, habilitar os canais que estão nos itens
        assistentesFormatados.forEach((assistente: any) => {
          canaisIds.forEach(channelId => {
            assistantChannels.push({
              assistantId: assistente.id,
              channelId: channelId,
              enabled: true
            });
          });
        });

        this.formulario.patchValue({ 
          canais: canaisFormatados,
          assistantChannels 
        });
      }

      this.cdr.detectChanges();
    } catch (error) {
      console.error('Erro ao mapear itens para formulário:', error);
    }
  }

  // Navegação do Stepper
  nextStep() {
    if (this.canProceedToNextStep()) {
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
      }
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  canProceedToNextStep(): boolean {
    if (!this.formulario) {
      return false;
    }

    switch (this.currentStep) {
      case 1: // Dados do Cliente
        const nome = this.formulario.get('nome');
        const email = this.formulario.get('email');
        const nomeValido = nome && nome.value && nome.value.length >= 2 && !nome.errors?.['required'];
        const emailValido = email && email.value && !email.errors?.['email'] && !email.errors?.['required'];
        return !!(nomeValido && emailValido);
      case 2: // Assistentes e Canais
        const setores = this.formulario.get('setores');
        const setoresValido = setores && setores.value && Array.isArray(setores.value) && setores.value.length > 0;
        return !!(setoresValido && this.validarAssistentes() && this.validarCanais());
      case 3: // Cálculo Plano
        const infrastructure = this.formulario.get('infrastructure');
        const selectedPeriod = this.formulario.get('selectedPeriod');
        const infrastructureValido = infrastructure && infrastructure.value !== null && infrastructure.value !== undefined;
        const periodoValido = selectedPeriod && selectedPeriod.value !== null && selectedPeriod.value !== undefined;
        return !!(infrastructureValido && periodoValido && this.resultadoSimulacao);
      case 4: // Revisão
        return !!this.resultadoSimulacao;
      default:
        return false;
    }
  }

  async confirmarOrcamento() {
    if (!this.canProceedToNextStep()) {
      return;
    }

    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Confirmando orçamento...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Buscar período e vendedor
      const periodoCodigo = this.formulario.get('selectedPeriod')?.value;
      let periodoData: PeriodoContratacao | null = null;

      if (periodoCodigo) {
        const periodos = await firstValueFrom(
          this.planoService.getPeriodosContratacao('id,asc').pipe(catchError(() => of([])))
        );
        periodoData = periodos?.find(p => p.codigo === periodoCodigo && p.ativo) || null;
      }

      const vendedors = await firstValueFrom(
        this.planoService.getVendedors('id,asc', 0, 100).pipe(catchError(() => of([])))
      );
      const vendedorId = vendedors?.find(v => v.tipo === 'SISTEMA_IA')?.id;

      if (!vendedorId) {
        throw new Error('Vendedor sistema não encontrado');
      }

      const leadData: LeadData = {
        nome: this.formulario.get('nome')?.value,
        email: this.formulario.get('email')?.value,
        telefone: this.formulario.get('telefone')?.value
      };

      const orcamentoDTO = this.converterParaOrcamentoDTO(leadData, periodoData, vendedorId);
      
      if (this.isEditingMode && this.orcamentoId) {
        // Atualiza orçamento existente
        orcamentoDTO.id = this.orcamentoId;
        const response = await firstValueFrom(
          this.orcamentoService.update(this.orcamentoId, orcamentoDTO).pipe(
            catchError((error) => {
              console.error('Erro ao atualizar orçamento:', error);
              throw error;
            })
          )
        );
        
        if (response.codigoHash) {
          this.hashProposta = response.codigoHash;
        }
       
      } else {
        // Cria novo orçamento
        const response = await firstValueFrom(
          this.orcamentoService.create(orcamentoDTO).pipe(
            catchError((error) => {
              console.error('Erro ao criar orçamento:', error);
              throw error;
            })
          )
        );
        
        if (response.codigoHash) {
          this.hashProposta = response.codigoHash;
          this.orcamentoId = response.id;
        }
      }

      loading.dismiss();
      this.isLoading = false;
      this.orcamentoConfirmado = true;
      this.cdr.detectChanges();
      
      const toast = await this.toastController.create({
        message: 'Orçamento confirmado com sucesso!',
        duration: 3000,
        color: 'success',
        position: 'top'
      });
      await toast.present();
      this.verPropostaCompleta();

    } catch (error: any) {
      loading.dismiss();
      this.isLoading = false;
      
      let errorMessage = 'Erro ao confirmar orçamento. Tente novamente.';
      if (error.error?.message) {
        errorMessage = error.error.message;
      }
      
      const toast = await this.toastController.create({
        message: errorMessage,
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    }
  }

  verPropostaCompleta() {
    if (this.hashProposta) {
      this.router.navigate(['/resultado-orcamento'], { queryParams: { hash: this.hashProposta } });

      //window.location.href = `/resultado-orcamento?hash=${this.hashProposta}`;

    }
  }

  novoOrcamento() {
    this.router.navigate(['/formulario-orcamento']);
  }

  private validarAssistentes(): boolean {
    const assistentes = this.formulario.get('assistentes')?.value || [];
    return Array.isArray(assistentes) && assistentes.some((a: any) => a.quantity > 0);
  }

  private validarCanais(): boolean {
    const assistentes = this.formulario.get('assistentes')?.value || [];
    const assistantChannels = this.formulario.get('assistantChannels')?.value || [];
    
    if (!Array.isArray(assistentes) || assistentes.length === 0) {
      return false;
    }
    
    const assistentesAtivos = assistentes.filter((a: any) => a.quantity > 0);
    
    if (assistentesAtivos.length === 0) {
      return false;
    }
    
    return assistentesAtivos.every((a: any) => 
      Array.isArray(assistantChannels) && 
      assistantChannels.some((ac: any) => ac.assistantId === a.id && ac.enabled)
    );
  }

  // Eventos dos subcomponentes

  onSetoresChange(setores: any[]) {
    this.formulario.patchValue({ setores });
  }

  onAssistentesChange(assistentes: any[]) {
    this.formulario.patchValue({ assistentes });
  }

  onCanaisChange(canais: any[], assistantChannels: any[]) {
    this.formulario.patchValue({ canais, assistantChannels });
  }

  async onInfrastructureChange(infrastructureId: number) {
    this.formulario.patchValue({ infrastructure: infrastructureId });
    await this.executarSimulacao();
  }

  onPeriodoChange(periodo: string) {
    this.formulario.patchValue({ selectedPeriod: periodo });
  }

  async executarSimulacao() {
    if (!this.canExecuteSimulation()) {
      return;
    }

    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Calculando proposta...',
      spinner: 'dots'
    });
    await loading.present();

    try {
      const planoBlueprint = this.converterParaPlanoBlueprint();
      const response = await firstValueFrom(
        this.planoService.simularGeracao(planoBlueprint).pipe(
          catchError((error) => {
            console.error('Erro na simulação:', error);
            this.showToast('Erro ao calcular proposta.', 'danger');
            return of(null);
          })
        )
      );

      if (response) {
        this.resultadoSimulacao = response;
        this.formulario.patchValue({ resultadoSimulacao: response });
      }
    } finally {
      loading.dismiss();
      this.isLoading = false;
    }
  }

  private canExecuteSimulation(): boolean {
    const assistentes = this.formulario.get('assistentes')?.value || [];
    const assistantChannels = this.formulario.get('assistantChannels')?.value || [];
    const infrastructure = this.formulario.get('infrastructure')?.value;

    const assistentesAtivos = assistentes.filter((a: any) => a.quantity > 0);
    if (assistentesAtivos.length === 0) return false;
    if (!infrastructure) return false;

    // Verificar se cada assistente tem pelo menos um canal
    const todosTemCanal = assistentesAtivos.every((a: any) =>
      assistantChannels.some((ac: any) => ac.assistantId === a.id && ac.enabled)
    );

    return todosTemCanal;
  }

  private converterParaPlanoBlueprint() {
    const formValue = this.formulario.value;
    const channelUsage: Record<number, number> = {};

    const assistentes = formValue.assistentes || [];
    assistentes
      .filter((a: any) => a.quantity > 0)
      .forEach((assistant: any) => {
        const assistantChannels = formValue.assistantChannels || [];
        assistantChannels
          .filter((ac: any) => ac.assistantId === assistant.id && ac.enabled)
          .forEach((ac: any) => {
            channelUsage[ac.channelId] = (channelUsage[ac.channelId] || 0) + assistant.quantity;
          });
      });

    const setores = (formValue.setores || []).map((s: any) => s.nome || s).join(', ');

    const itens = [
      ...(formValue.infrastructure ? [{
        tipoItem: 'INFRAESTRUTURA' as const,
        referenciaId: formValue.infrastructure,
        quantidade: 1
      }] : []),
      ...assistentes
        .filter((a: any) => a.quantity > 0)
        .map((a: any) => ({
          tipoItem: 'ASSISTENTE' as const,
          referenciaId: a.id,
          quantidade: a.quantity
        })),
      ...Object.entries(channelUsage).map(([channelId, quantidade]) => ({
        tipoItem: 'CANAL' as const,
        referenciaId: Number(channelId),
        quantidade
      }))
    ];

    return {
      nomePlano: `Plano ${setores || 'Personalizado'}`,
      itens,
      consumoEstimado: {
        tokensOpenAi: formValue.tokensOpenAi || 1000000,
        mensagensWhatsapp: formValue.monthlyCredits || 1000
      }
    };
  }

  async finalizarOrcamento() {
    if (!this.canProceedToNextStep() || this.isLoading) return;

    const loading = await this.loadingController.create({
      message: 'Gerando proposta...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      this.isLoading = true;

      // Buscar período e vendedor
      const periodoCodigo = this.formulario.get('selectedPeriod')?.value;
      let periodoData: PeriodoContratacao | null = null;

      if (periodoCodigo) {
        const periodos = await firstValueFrom(
          this.planoService.getPeriodosContratacao('id,asc').pipe(catchError(() => of([])))
        );
        periodoData = periodos?.find(p => p.codigo === periodoCodigo && p.ativo) || null;
      }

      const vendedors = await firstValueFrom(
        this.planoService.getVendedors('id,asc', 0, 100).pipe(catchError(() => of([])))
      );
      const vendedorId = vendedors?.find(v => v.tipo === 'SISTEMA_IA')?.id;

      if (!vendedorId) {
        throw new Error('Vendedor sistema não encontrado');
      }

      const leadData: LeadData = {
        nome: this.formulario.get('nome')?.value,
        email: this.formulario.get('email')?.value,
        telefone: this.formulario.get('telefone')?.value
      };

      const orcamentoDTO = this.converterParaOrcamentoDTO(leadData, periodoData, vendedorId);

      if (this.isEditingMode && this.orcamentoId) {
        orcamentoDTO.id = this.orcamentoId;
        this.orcamentoService.update(this.orcamentoId, orcamentoDTO)
          .pipe(finalize(() => {
            this.isLoading = false;
            loading.dismiss();
          }))
          .subscribe({
            next: (orcamento) => {
              const hash = orcamento.codigoHash || this.orcamentoHash;
              this.router.navigate(['/resultado-orcamento'], { queryParams: { hash } });
            },
            error: (err) => {
              console.error('Erro ao atualizar orçamento:', err);
              this.showToast('Erro ao atualizar proposta.', 'danger');
            }
          });
      } else {
        this.orcamentoService.create(orcamentoDTO)
          .pipe(finalize(() => {
            this.isLoading = false;
            loading.dismiss();
          }))
          .subscribe({
            next: (orcamento) => {
              if (orcamento.codigoHash) {
                this.hashProposta = orcamento.codigoHash;
                this.propostaGerada = true;
                this.showToast('Proposta gerada com sucesso!', 'success');
                this.cdr.detectChanges();
              } else {
                this.showToast('Orçamento criado, mas hash não encontrado.', 'warning');
              }
            },
            error: (err) => {
              console.error('Erro ao criar orçamento:', err);
              this.showToast('Erro ao gerar proposta.', 'danger');
            }
          });
      }
    } catch (e: any) {
      loading.dismiss();
      this.isLoading = false;
      console.error('Erro na finalização:', e);
      this.showToast('Erro ao preparar proposta.', 'danger');
    }
  }

  private converterParaOrcamentoDTO(
    leadData: LeadData,
    periodoData: PeriodoContratacao | null,
    vendedorId: number
  ): OrcamentoDTO {
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
      infraestrutura: { id: this.formulario.get('infrastructure')?.value },
      vendedor: { id: vendedorId },
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

    const empresaData = this.formulario.get('empresaData')?.value;
    if (empresaData && empresaData.cnpj) {
      orcamento.empresaDadosCnpj = {
        cnpj: empresaData.cnpj,
        razaoSocial: empresaData.razaoSocial,
        nomeFantasia: empresaData.nomeFantasia,
        situacaoCadastral: empresaData.situacaoCadastral || 'ATIVA',
        emailFinanceiro: leadData?.email || ''
      };
    }

    return orcamento;
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

