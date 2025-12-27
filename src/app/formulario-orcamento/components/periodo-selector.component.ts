import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { PlanoService } from '../../services/plano.service';
import { PeriodoContratacao } from '../../models/periodo-contratacao.model';
import { firstValueFrom, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-periodo-selector',
  templateUrl: './periodo-selector.component.html',
  styleUrls: ['./periodo-selector.component.scss'],
  standalone: false,
})
export class PeriodoSelectorComponent implements OnInit, OnChanges, OnDestroy {
  @Input() formGroup!: FormGroup;
  @Output() periodoChange = new EventEmitter<string>();

  periodos: PeriodoContratacao[] = [];
  carregando = false;
  baseMonthlyValue = 0;
  private resultadoSimulacaoSubscription?: Subscription;
  private selectedPeriodSubscription?: Subscription;

  periodCards: Array<{
    codigo: string;
    nome: string;
    meses: number;
    precoBruto: number;
    valorDesconto: number;
    precoComDesconto: number;
    precoMensalEquivalente: number;
    percentualDesconto?: number;
    tipoDesconto?: string;
  }> = [];

  constructor(
    private planoService: PlanoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['formGroup'] && this.formGroup) {
      this.configurarObservadores();
      
      // Carregar valor inicial se já existir
      const resultado = this.formGroup.get('resultadoSimulacao')?.value;
      if (resultado && resultado.valorMensalTotal) {
        this.baseMonthlyValue = resultado.valorMensalTotal;
        this.calcularValoresPorPeriodo();
      }
    }
  }

  private configurarObservadores() {
    // Limpar subscriptions anteriores
    if (this.resultadoSimulacaoSubscription) {
      this.resultadoSimulacaoSubscription.unsubscribe();
    }
    if (this.selectedPeriodSubscription) {
      this.selectedPeriodSubscription.unsubscribe();
    }

    if (!this.formGroup) {
      return;
    }

    // Observar mudanças no resultado da simulação
    const resultadoSimulacaoControl = this.formGroup.get('resultadoSimulacao');
    if (resultadoSimulacaoControl) {
      this.resultadoSimulacaoSubscription = resultadoSimulacaoControl.valueChanges.subscribe((resultado: any) => {
        if (resultado && resultado.valorMensalTotal) {
          this.baseMonthlyValue = resultado.valorMensalTotal;
          this.calcularValoresPorPeriodo();
        }
      });

      // Carregar valor inicial se já existir
      const valorInicial = resultadoSimulacaoControl.value;
      if (valorInicial && valorInicial.valorMensalTotal) {
        this.baseMonthlyValue = valorInicial.valorMensalTotal;
        this.calcularValoresPorPeriodo();
      }
    }
    
    // Observar mudanças no selectedPeriod para atualizar a UI
    const selectedPeriod = this.formGroup.get('selectedPeriod');
    if (selectedPeriod) {
      this.selectedPeriodSubscription = selectedPeriod.valueChanges.subscribe(() => {
        this.cdr.detectChanges();
      });
    }
  }

  async ngOnInit() {
    await this.carregarPeriodos();
    
    if (this.formGroup) {
      this.configurarObservadores();
      
      // Verificar se já existe um período selecionado no formulário
      const selectedPeriod = this.formGroup.get('selectedPeriod')?.value;
      if (selectedPeriod) {
        // Força a detecção de mudanças para atualizar a UI
        setTimeout(() => {
          this.cdr.detectChanges();
        }, 0);
      }
    }
  }

  ngOnDestroy() {
    if (this.resultadoSimulacaoSubscription) {
      this.resultadoSimulacaoSubscription.unsubscribe();
    }
    if (this.selectedPeriodSubscription) {
      this.selectedPeriodSubscription.unsubscribe();
    }
  }

  async carregarPeriodos() {
    this.carregando = true;
    try {
      const periodos = await firstValueFrom(
        this.planoService.getPeriodosContratacao('id,asc').pipe(
          catchError(() => of([]))
        )
      );
      this.periodos = periodos.filter(p => p.ativo);
      this.calcularValoresPorPeriodo();
    } catch (error) {
      console.error('Erro ao carregar períodos:', error);
    } finally {
      this.carregando = false;
    }
  }

  private calcularValoresPorPeriodo() {
    if (!this.baseMonthlyValue || this.baseMonthlyValue <= 0 || this.periodos.length === 0) {
      this.periodCards = [];
      this.cdr.detectChanges();
      return;
    }

    this.periodCards = this.periodos.map(periodo => {
      const meses = periodo.meses || 1;
      const precoBruto = this.baseMonthlyValue * meses;

      let valorDesconto = 0;
      if (periodo.tipoDesconto === 'PERCENTUAL') {
        valorDesconto = precoBruto * (periodo.valorDesconto / 100);
      } else if (periodo.tipoDesconto === 'VALOR_FIXO') {
        valorDesconto = periodo.valorDesconto;
      }

      const precoComDesconto = Math.max(precoBruto - valorDesconto, 0);
      const precoMensalEquivalente = precoComDesconto / meses;

      return {
        codigo: periodo.codigo,
        nome: periodo.nome,
        meses,
        precoBruto,
        valorDesconto,
        precoComDesconto,
        precoMensalEquivalente,
        percentualDesconto: periodo.tipoDesconto === 'PERCENTUAL' ? periodo.valorDesconto : undefined,
        tipoDesconto: periodo.tipoDesconto
      };
    });
    
    this.cdr.detectChanges();
  }

  selectPeriod(codigo: string) {
    this.formGroup.patchValue({ selectedPeriod: codigo });
    this.periodoChange.emit(codigo);
  }

  isSelected(codigo: string): boolean {
    return this.formGroup.get('selectedPeriod')?.value === codigo;
  }

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }
}

