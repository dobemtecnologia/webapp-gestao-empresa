import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { PlanoSimulacaoResponse } from '../../models/plano-simulacao-response.model';

@Component({
  selector: 'app-calculo-plano',
  templateUrl: './calculo-plano.component.html',
  styleUrls: ['./calculo-plano.component.scss'],
  standalone: false,
})
export class CalculoPlanoComponent {
  @Input() formGroup!: FormGroup;
  @Input() resultadoSimulacao?: PlanoSimulacaoResponse;
  @Output() infrastructureChange = new EventEmitter<number>();
  @Output() periodoChange = new EventEmitter<string>();
}

