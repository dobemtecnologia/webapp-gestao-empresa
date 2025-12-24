import { Component, OnInit, inject } from '@angular/core';
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

@Component({
  selector: 'app-formulario-orcamento',
  templateUrl: './formulario-orcamento.page.html',
  styleUrls: ['./formulario-orcamento.page.scss'],
  standalone: false,
})
export class FormularioOrcamentoPage implements OnInit {
  formulario!: FormGroup;
  currentStep = 1; // 1: Dados Cliente, 2: Configuração, 3: Revisão
  totalSteps = 3;

  // Estado do formulário
  resultadoSimulacao?: PlanoSimulacaoResponse;
  isLoading = false;
  isEditingMode = false;
  orcamentoId?: number;
  orcamentoHash?: string;

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

  ngOnInit() {
    this.menuController.enable(false);
    this.loginAutomatico();
    this.inicializarFormulario();
    this.verificarModoEdicao();
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

    if (hash && action === 'edit') {
      this.isEditingMode = true;
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
        infrastructure: orcamento.infraestrutura?.id || null,
        selectedPeriod: null // Será calculado baseado no desconto
      });

      if (orcamento.empresaDadosCnpj) {
        this.formulario.patchValue({
          cnpj: orcamento.empresaDadosCnpj.cnpj || '',
          empresaData: {
            cnpj: orcamento.empresaDadosCnpj.cnpj || '',
            razaoSocial: orcamento.empresaDadosCnpj.razaoSocial || '',
            nomeFantasia: orcamento.empresaDadosCnpj.nomeFantasia || '',
            situacaoCadastral: orcamento.empresaDadosCnpj.situacaoCadastral || ''
          }
        });
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
    // Implementar mapeamento similar ao Wizard
    // Por enquanto, placeholder
    console.log('Mapeando itens para formulário:', itens);
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
    switch (this.currentStep) {
      case 1: // Dados do Cliente
        return !!(this.formulario.get('nome')?.valid && 
               this.formulario.get('email')?.valid);
      case 2: // Configuração do Plano
        return !!(this.formulario.get('setores')?.valid &&
               this.formulario.get('infrastructure')?.valid &&
               this.formulario.get('selectedPeriod')?.valid &&
               this.validarAssistentes() &&
               this.validarCanais());
      case 3: // Revisão
        return !!this.resultadoSimulacao;
      default:
        return false;
    }
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
                this.router.navigate(['/resultado-orcamento'], { queryParams: { hash: orcamento.codigoHash } });
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

