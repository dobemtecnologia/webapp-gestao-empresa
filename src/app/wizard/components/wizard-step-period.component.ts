import { Component, inject } from '@angular/core';
import { WizardStateService } from '../../services/wizard-state.service';
import { PeriodOption } from '../../models/wizard-state.model';

@Component({
  selector: 'app-wizard-step-period',
  templateUrl: './wizard-step-period.component.html',
  styleUrls: ['./wizard-step-period.component.scss'],
  standalone: false,
})
export class WizardStepPeriodComponent {
  wizardState = inject(WizardStateService);

  selectedPeriod = this.wizardState.selectedPeriod;

  periods: PeriodOption[] = [
    {
      id: 'MENSAL',
      nome: 'Mensal',
      descricao: 'Pagamento mensal recorrente',
      desconto: 0
    },
    {
      id: 'TRIMESTRAL',
      nome: 'Trimestral',
      descricao: 'Pagamento a cada 3 meses',
      desconto: 5,
      recomendado: false
    },
    {
      id: 'SEMESTRAL',
      nome: 'Semestral',
      descricao: 'Pagamento a cada 6 meses',
      desconto: 10,
      recomendado: true
    },
    {
      id: 'ANUAL',
      nome: 'Anual',
      descricao: 'Pagamento anual',
      desconto: 15
    }
  ];

  selectPeriod(periodId: 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL') {
    this.wizardState.setSelectedPeriod(periodId);
  }

  isSelected(periodId: string): boolean {
    return this.selectedPeriod() === periodId;
  }

  formatarDesconto(desconto: number): string {
    if (desconto === 0) return '';
    return `${desconto}% OFF`;
  }
}
