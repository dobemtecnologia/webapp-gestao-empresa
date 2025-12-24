import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { PlanoSimulacaoResponse } from '../../models/plano-simulacao-response.model';

@Component({
  selector: 'app-resumo-orcamento',
  templateUrl: './resumo-orcamento.component.html',
  styleUrls: ['./resumo-orcamento.component.scss'],
  standalone: false,
})
export class ResumoOrcamentoComponent {
  @Input() formulario!: FormGroup;
  @Input() resultadoSimulacao?: PlanoSimulacaoResponse;

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  }

  formatarSetores(): string {
    const setores = this.formulario.get('setores')?.value;
    if (!setores || !Array.isArray(setores) || setores.length === 0) {
      return 'N/A';
    }
    return setores.map((s: any) => s.nome || s).join(', ');
  }
}

