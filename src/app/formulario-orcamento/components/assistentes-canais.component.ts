import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-assistentes-canais',
  templateUrl: './assistentes-canais.component.html',
  styleUrls: ['./assistentes-canais.component.scss'],
  standalone: false,
})
export class AssistentesCanaisComponent {
  @Input() formGroup!: FormGroup;
  @Output() setoresChange = new EventEmitter<any[]>();
  @Output() assistentesChange = new EventEmitter<any[]>();
  @Output() canaisChange = new EventEmitter<{ canais: any[]; assistantChannels: any[] }>();
}

