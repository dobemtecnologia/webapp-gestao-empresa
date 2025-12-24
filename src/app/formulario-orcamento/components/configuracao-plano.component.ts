import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-configuracao-plano',
  templateUrl: './configuracao-plano.component.html',
  styleUrls: ['./configuracao-plano.component.scss'],
  standalone: false,
})
export class ConfiguracaoPlanoComponent implements OnInit {
  @Input() formGroup!: FormGroup;
  @Output() setoresChange = new EventEmitter<any[]>();
  @Output() assistentesChange = new EventEmitter<any[]>();
  @Output() canaisChange = new EventEmitter<{ canais: any[]; assistantChannels: any[] }>();
  @Output() infrastructureChange = new EventEmitter<number>();
  @Output() periodoChange = new EventEmitter<string>();
  @Output() nextMainStep = new EventEmitter<void>();
  @Output() subStepChange = new EventEmitter<{ currentSubStep: number; totalSubSteps: number }>();

  currentSubStep = 1; // 1: Setores, 2: Assistentes, 3: Canais, 4: Infraestrutura, 5: Período
  totalSubSteps = 5;

  nextSubStep() {
    if (this.currentSubStep < this.totalSubSteps) {
      this.currentSubStep++;
      this.emitSubStepChange();
    } else {
      // Se estiver no último sub-step, avança para o próximo step principal
      this.nextMainStep.emit();
    }
  }

  previousSubStep() {
    if (this.currentSubStep > 1) {
      this.currentSubStep--;
      this.emitSubStepChange();
    }
  }

  private emitSubStepChange() {
    this.subStepChange.emit({
      currentSubStep: this.currentSubStep,
      totalSubSteps: this.totalSubSteps
    });
  }

  ngOnInit() {
    this.emitSubStepChange();
  }
}

