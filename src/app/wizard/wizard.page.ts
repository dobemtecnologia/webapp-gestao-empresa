import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { WizardStateService } from '../services/wizard-state.service';
import { PlanoService } from '../services/plano.service';
import { PlanoBlueprint } from '../models/plano-blueprint.model';
import { PlanoSimulacaoResponse } from '../models/plano-simulacao-response.model';
import { LoadingController, ToastController } from '@ionic/angular';

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
  private loadingController = inject(LoadingController);
  private toastController = inject(ToastController);

  resultadoSimulacao?: PlanoSimulacaoResponse;
  isLoading = false;

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
