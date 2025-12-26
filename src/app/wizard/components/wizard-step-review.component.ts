import { Component, inject } from '@angular/core';
import { WizardStateService } from '../../services/wizard-state.service';
import { PlanoService } from '../../services/plano.service';
import { PeriodoContratacao } from '../../models/periodo-contratacao.model';

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
  selectedPeriod = this.wizardState.selectedPeriod;
  baseMonthlyValue = this.wizardState.baseMonthlyValue;

  infraestruturas: any[] = [];
  assistentes: any[] = [];
  canals: any[] = [];
  periodos: PeriodoContratacao[] = [];

  // Resumo de valores por período
  resumoPeriodo: {
    labelPeriodo: string;
    meses: number;
    precoMensalBase: number;
    precoPeriodoBruto: number;
    descontoPercentual: number;
    valorDesconto: number;
    precoPeriodoComDesconto: number;
    precoMensalComDesconto: number;
  } | null = null;

  constructor() {
    this.carregarDados();
  }

  carregarDados() {
    // Carrega dados para exibir nomes
    this.planoService.getInfraestruturas('id,asc').subscribe({
      next: (infras) => (this.infraestruturas = infras),
    });

    // Usa endpoint por setores se houver setores selecionados
    const setoresIds = this.selectedSectors().map(s => s.id);
    const assistentesObservable = setoresIds.length > 0
      ? this.planoService.getAssistentesPorSetores(setoresIds)
      : this.planoService.getAssistentes('id,asc');
    
    assistentesObservable.subscribe({
      next: (assist) => (this.assistentes = assist),
    });

    this.planoService.getCanals('id,asc').subscribe({
      next: (canals) => (this.canals = canals),
    });

    // Carrega períodos para calcular desconto aplicado
    this.planoService.getPeriodosContratacao('id,asc').subscribe({
      next: (periodos) => {
        this.periodos = periodos.filter((p) => p.ativo);
        this.calcularResumoPeriodo();
      },
    });
  }

  private calcularResumoPeriodo() {
    const baseMensal = this.baseMonthlyValue() ?? 0;
    const codigoPeriodo = this.selectedPeriod();

    if (!baseMensal || !codigoPeriodo || this.periodos.length === 0) {
      this.resumoPeriodo = null;
      return;
    }

    const periodo = this.periodos.find(
      (p) => p.codigo === codigoPeriodo || p.nome.toUpperCase() === codigoPeriodo
    );

    if (!periodo) {
      this.resumoPeriodo = null;
      return;
    }

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

    this.resumoPeriodo = {
      labelPeriodo: this.getPeriodLabel(codigoPeriodo),
      meses,
      precoMensalBase: baseMensal,
      precoPeriodoBruto,
      descontoPercentual: periodo.valorDesconto,
      valorDesconto,
      precoPeriodoComDesconto,
      precoMensalComDesconto,
    };
  }

  getInfrastructureName(id: number): string {
    return this.infraestruturas.find((i) => i.id === id)?.nome || `Infraestrutura #${id}`;
  }

  getAssistantName(id: number): string {
    return this.assistentes.find((a) => a.id === id)?.nome || `Assistente #${id}`;
  }

  getChannelName(id: number): string {
    return this.canals.find((c) => c.id === id)?.nome || `Canal #${id}`;
  }

  getTotalAssistants(): number {
    return this.assistants().reduce((sum, a) => sum + a.quantity, 0);
  }

  getTotalChannels(): number {
    return this.channels().filter((c) => c.enabled).length;
  }

  formatarNumero(valor: number): string {
    if (valor >= 1000000) {
      return `${(valor / 1000000).toFixed(1)}M`;
    } else if (valor >= 1000) {
      return `${(valor / 1000).toFixed(0)}k`;
    }
    return valor.toString();
  }

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  }

  getPeriodLabel(period: string): string {
    const labels: { [key: string]: string } = {
      MENSAL: 'Mensal',
      TRIMESTRAL: 'Trimestral',
      SEMESTRAL: 'Semestral',
      ANUAL: 'Anual',
    };
    return labels[period] || period;
  }
}
