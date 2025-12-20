import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { LeadData } from '../../models/orcamento.model';

@Component({
  selector: 'app-lead-capture-modal',
  templateUrl: './lead-capture-modal.component.html',
  styleUrls: ['./lead-capture-modal.component.scss'],
  standalone: false,
})
export class LeadCaptureModalComponent {
  private formBuilder = inject(FormBuilder);
  private modalController = inject(ModalController);

  leadForm: FormGroup;

  constructor() {
    this.leadForm = this.formBuilder.group({
      nome: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      telefone: ['']
    });
  }

  async onSubmit() {
    if (this.leadForm.valid) {
      const leadData: LeadData = {
        nome: this.leadForm.value.nome,
        email: this.leadForm.value.email,
        telefone: this.leadForm.value.telefone || undefined
      };
      await this.modalController.dismiss(leadData);
    } else {
      this.markFormGroupTouched();
    }
  }

  async cancelar() {
    await this.modalController.dismiss();
  }

  private markFormGroupTouched() {
    Object.keys(this.leadForm.controls).forEach(key => {
      const control = this.leadForm.get(key);
      control?.markAsTouched();
    });
  }
}



