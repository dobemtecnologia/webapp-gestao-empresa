import { Component, OnInit, inject } from '@angular/core';
import { WizardStateService } from '../../services/wizard-state.service';

@Component({
  selector: 'app-wizard-step-volume',
  templateUrl: './wizard-step-volume.component.html',
  styleUrls: ['./wizard-step-volume.component.scss'],
  standalone: false,
})
export class WizardStepVolumeComponent implements OnInit {
  wizardState = inject(WizardStateService);

  monthlyCredits = this.wizardState.monthlyCredits;
  tokensOpenAi = this.wizardState.tokensOpenAi;

  // Pontos de parada do slider
  creditSnaps = [1000, 5000, 10000, 50000, 100000];
  tokenSnaps = [10000, 50000, 100000, 500000, 1000000];

  ngOnInit() {
    // Garante que o valor inicial está em um snap válido
    this.ajustarParaSnapMaisProximo();
  }

  onCreditsChange(event: any) {
    const value = event.detail.value;
    this.wizardState.setMonthlyCredits(value);
  }

  onTokensChange(event: any) {
    const value = event.detail.value;
    this.wizardState.setTokensOpenAi(value);
  }

  ajustarParaSnapMaisProximo() {
    const credits = this.monthlyCredits();
    const tokens = this.tokensOpenAi();
    
    const closestCredit = this.creditSnaps.reduce((prev, curr) =>
      Math.abs(curr - credits) < Math.abs(prev - credits) ? curr : prev
    );
    
    const closestToken = this.tokenSnaps.reduce((prev, curr) =>
      Math.abs(curr - tokens) < Math.abs(prev - tokens) ? curr : prev
    );
    
    this.wizardState.setMonthlyCredits(closestCredit);
    this.wizardState.setTokensOpenAi(closestToken);
  }

  formatarNumero(valor: number): string {
    if (valor >= 1000000) {
      return `${(valor / 1000000).toFixed(1)}M`;
    } else if (valor >= 1000) {
      return `${(valor / 1000).toFixed(0)}k`;
    }
    return valor.toString();
  }

  calcularHorasHumanas(mensagens: number): number {
    // Estimativa: 1 hora humana = ~20 mensagens processadas
    return Math.round(mensagens / 20);
  }
}
