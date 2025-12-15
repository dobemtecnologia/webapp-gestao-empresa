import { Component, OnInit, inject, effect } from '@angular/core';
import { WizardStateService } from '../../services/wizard-state.service';
import { PlanoService } from '../../services/plano.service';
import { PeriodoContratacao } from '../../models/periodo-contratacao.model';

@Component({
  selector: 'app-wizard-step-period',
  templateUrl: './wizard-step-period.component.html',
  styleUrls: ['./wizard-step-period.component.scss'],
  standalone: false,
})
export class WizardStepPeriodComponent implements OnInit {
  wizardState = inject(WizardStateService);
  planoService = inject(PlanoService);

  selectedPeriod = this.wizardState.selectedPeriod;
  baseMonthlyValue = this.wizardState.baseMonthlyValue;

  periodosApi: PeriodoContratacao[] = [];

  // Dados calculados para exibição
  periodCards: Array<{
    id: number;
    nome: string;
    codigo: string;
    meses: number;
    descontoPercentual: number;
    precoBruto: number;
    valorDesconto: number;
    precoComDesconto: number;
    precoMensalEquivalente: number;
    economiaLabel: string;
    recomendado: boolean;
  }> = [];

  carregando = false;

  constructor() {
    // Recalcula valores sempre que o valor mensal base for atualizado
    effect(() => {
      const baseMensal = this.baseMonthlyValue();
      if (baseMensal && baseMensal > 0 && this.periodosApi.length > 0) {
        this.calcularValoresPorPeriodo();
      }
    });
  }

  ngOnInit() {
    this.carregarPeriodos();
  }

  carregarPeriodos() {
    this.carregando = true;
    this.planoService.getPeriodosContratacao('id,asc').subscribe({
      next: (periodos) => {
        // Considera apenas períodos ativos
        this.periodosApi = periodos.filter(p => p.ativo);
        this.calcularValoresPorPeriodo();
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
      }
    });
  }

  private calcularValoresPorPeriodo() {
    const baseMensal = this.baseMonthlyValue() ?? 0;

    if (!baseMensal || baseMensal <= 0 || this.periodosApi.length === 0) {
      this.periodCards = [];
      return;
    }

    this.periodCards = this.periodosApi.map((periodo) => {
      const meses = periodo.meses || 1;
      const precoBruto = baseMensal * meses;

      let valorDesconto = 0;
      if (periodo.tipoDesconto === 'PERCENTUAL') {
        valorDesconto = precoBruto * (periodo.valorDesconto / 100);
      } else if (periodo.tipoDesconto === 'VALOR_FIXO') {
        valorDesconto = periodo.valorDesconto;
      }

      const precoComDesconto = Math.max(precoBruto - valorDesconto, 0);
      const precoMensalEquivalente = precoComDesconto / meses;

      const economiaLabel = valorDesconto > 0
        ? `Economize ${this.formatarMoeda(valorDesconto)} no período`
        : 'Sem desconto';

      // Por enquanto, podemos marcar ANUAL como recomendado, se existir
      const recomendado = periodo.codigo === 'ANUAL';

      return {
        id: periodo.id,
        nome: periodo.nome,
        codigo: periodo.codigo,
        meses,
        descontoPercentual: periodo.valorDesconto,
        precoBruto,
        valorDesconto,
        precoComDesconto,
        precoMensalEquivalente,
        economiaLabel,
        recomendado
      };
    });
  }

  selectPeriod(codigo: 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL' | string) {
    // Guarda apenas os códigos conhecidos no estado tipado
    const codigoNormalizado = codigo as 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
    this.wizardState.setSelectedPeriod(codigoNormalizado);
  }

  isSelected(codigo: string): boolean {
    return this.selectedPeriod() === codigo;
  }

  formatarDesconto(percentual: number): string {
    if (!percentual) return '';
    return `${percentual}% OFF`;
  }

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }
}
