import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-assistentes-selector',
  templateUrl: './assistentes-selector.component.html',
  styleUrls: ['./assistentes-selector.component.scss'],
  standalone: false,
})
export class AssistentesSelectorComponent {
  @Input() formGroup!: FormGroup;
  @Output() assistentesChange = new EventEmitter<any[]>();

  // Placeholder - será implementado com lógica similar ao WizardStepAssistantsComponent
}

