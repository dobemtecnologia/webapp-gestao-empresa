import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-configuracao-plano',
  templateUrl: './configuracao-plano.component.html',
  styleUrls: ['./configuracao-plano.component.scss'],
  standalone: false,
})
export class ConfiguracaoPlanoComponent {
  @Input() formGroup!: FormGroup;
  @Output() setoresChange = new EventEmitter<any[]>();
  @Output() assistentesChange = new EventEmitter<any[]>();
  @Output() canaisChange = new EventEmitter<{ canais: any[]; assistantChannels: any[] }>();
  @Output() infrastructureChange = new EventEmitter<number>();
  @Output() periodoChange = new EventEmitter<string>();

  currentSubStep = 1; // 1: Setores, 2: Assistentes, 3: Canais, 4: Infraestrutura, 5: Período
  totalSubSteps = 5;

  nextSubStep() {
    if (this.currentSubStep < this.totalSubSteps) {
      this.currentSubStep++;
    }
  }

  previousSubStep() {
    if (this.currentSubStep > 1) {
      this.currentSubStep--;
    }
  }
}

