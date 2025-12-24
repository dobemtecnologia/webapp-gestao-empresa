import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-canais-config',
  templateUrl: './canais-config.component.html',
  styleUrls: ['./canais-config.component.scss'],
  standalone: false,
})
export class CanaisConfigComponent {
  @Input() formGroup!: FormGroup;
  @Output() canaisChange = new EventEmitter<{ canais: any[]; assistantChannels: any[] }>();

  // Placeholder - será implementado com lógica similar ao WizardStepChannelsComponent
}

