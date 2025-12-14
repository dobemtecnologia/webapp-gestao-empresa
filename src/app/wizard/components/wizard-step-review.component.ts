import { Component, inject } from '@angular/core';
import { WizardStateService } from '../../services/wizard-state.service';
import { PlanoService } from '../../services/plano.service';

@Component({
  selector: 'app-wizard-step-review',
  templateUrl: './wizard-step-review.component.html',
  styleUrls: ['./wizard-step-review.component.scss'],
  standalone: false,
})
export class WizardStepReviewComponent {
  wizardState = inject(WizardStateService);
  planoService = inject(PlanoService);

  selectedSectors = this.wizardState.selectedSectors;
  assistants = this.wizardState.assistants;
  channels = this.wizardState.channels;
  infrastructure = this.wizardState.infrastructure;
  monthlyCredits = this.wizardState.monthlyCredits;
  tokensOpenAi = this.wizardState.tokensOpenAi;

  infraestruturas: any[] = [];
  assistentes: any[] = [];
  canals: any[] = [];

  constructor() {
    this.carregarDados();
  }

  carregarDados() {
    // Carrega dados para exibir nomes
    this.planoService.getInfraestruturas('id,asc').subscribe({
      next: (infras) => this.infraestruturas = infras
    });
    
    this.planoService.getAssistentes('id,asc').subscribe({
      next: (assist) => this.assistentes = assist
    });
    
    this.planoService.getCanals('id,asc').subscribe({
      next: (canals) => this.canals = canals
    });
  }

  getInfrastructureName(id: number): string {
    return this.infraestruturas.find(i => i.id === id)?.nome || `Infraestrutura #${id}`;
  }

  getAssistantName(id: number): string {
    return this.assistentes.find(a => a.id === id)?.nome || `Assistente #${id}`;
  }

  getChannelName(id: number): string {
    return this.canals.find(c => c.id === id)?.nome || `Canal #${id}`;
  }

  getTotalAssistants(): number {
    return this.assistants().reduce((sum, a) => sum + a.quantity, 0);
  }

  getTotalChannels(): number {
    return this.channels().filter(c => c.enabled).length;
  }

  formatarNumero(valor: number): string {
    if (valor >= 1000000) {
      return `${(valor / 1000000).toFixed(1)}M`;
    } else if (valor >= 1000) {
      return `${(valor / 1000).toFixed(0)}k`;
    }
    return valor.toString();
  }
}
