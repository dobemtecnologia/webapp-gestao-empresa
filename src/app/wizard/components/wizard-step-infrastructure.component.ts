import { Component, OnInit, inject } from '@angular/core';
import { WizardStateService } from '../../services/wizard-state.service';
import { PlanoService } from '../../services/plano.service';
import { Infraestrutura } from '../../models/infraestrutura.model';

@Component({
  selector: 'app-wizard-step-infrastructure',
  templateUrl: './wizard-step-infrastructure.component.html',
  styleUrls: ['./wizard-step-infrastructure.component.scss'],
  standalone: false,
})
export class WizardStepInfrastructureComponent implements OnInit {
  wizardState = inject(WizardStateService);
  planoService = inject(PlanoService);

  infraestruturas: Infraestrutura[] = [];
  carregandoInfraestruturas = false;
  infrastructure = this.wizardState.infrastructure;

  ngOnInit() {
    this.carregarInfraestruturas();
  }

  carregarInfraestruturas() {
    this.carregandoInfraestruturas = true;
    this.planoService.getInfraestruturas('id,asc').subscribe({
      next: (infraestruturas) => {
        this.infraestruturas = infraestruturas;
        this.carregandoInfraestruturas = false;
      },
      error: () => {
        this.carregandoInfraestruturas = false;
      }
    });
  }

  selectInfrastructure(infraId: number) {
    this.wizardState.setInfrastructure(infraId);
  }

  isSelected(infraId: number): boolean {
    return this.infrastructure() === infraId;
  }

  getInfrastructureTypeLabel(tipo: string): string {
    const labels: { [key: string]: string } = {
      'COMPARTILHADO_LITE': 'Compartilhado Lite',
      'DEDICADO_PADRAO': 'Dedicado Padrão',
      'DEDICADO_PERFORMANCE': 'Dedicado Performance'
    };
    return labels[tipo] || tipo;
  }

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }
}
