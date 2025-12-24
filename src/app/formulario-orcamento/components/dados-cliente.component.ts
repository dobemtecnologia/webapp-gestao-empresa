import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { CnpjService } from '../../services/cnpj.service';
import { SetorService } from '../../services/setor.service';
import { CNPJResponse } from '../../models/cnpj-response.model';
import { SetorDTO } from '../../models/setor.model';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LoadingController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-dados-cliente',
  templateUrl: './dados-cliente.component.html',
  styleUrls: ['./dados-cliente.component.scss'],
  standalone: false,
})
export class DadosClienteComponent {
  @Input() formGroup!: FormGroup;
  @Output() cnpjConsultado = new EventEmitter<SetorDTO[]>();

  isConsultingCNPJ = false;
  setorSugerido?: SetorDTO;

  constructor(
    private cnpjService: CnpjService,
    private setorService: SetorService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  formatarCNPJ(cnpj: string): string {
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    
    if (cnpjLimpo.length <= 2) {
      return cnpjLimpo;
    } else if (cnpjLimpo.length <= 5) {
      return cnpjLimpo.replace(/(\d{2})(\d+)/, '$1.$2');
    } else if (cnpjLimpo.length <= 8) {
      return cnpjLimpo.replace(/(\d{2})(\d{3})(\d+)/, '$1.$2.$3');
    } else if (cnpjLimpo.length <= 12) {
      return cnpjLimpo.replace(/(\d{2})(\d{3})(\d{3})(\d+)/, '$1.$2.$3/$4');
    } else {
      return cnpjLimpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  }

  onCNPJInput(event: any) {
    const valor = event.target.value || '';
    const cnpjFormatado = this.formatarCNPJ(valor);
    this.formGroup.patchValue({ cnpj: cnpjFormatado });
  }

  async consultarCNPJ() {
    const cnpj = this.formGroup.get('cnpj')?.value || '';
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    
    if (cnpjLimpo.length !== 14) {
      this.showToast('CNPJ inválido. Por favor, digite um CNPJ válido (14 dígitos).', 'warning');
      return;
    }

    this.isConsultingCNPJ = true;
    const loading = await this.loadingController.create({
      message: 'Consultando CNPJ...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const cnpjData: CNPJResponse = await firstValueFrom(
        this.cnpjService.consultarCNPJ(cnpjLimpo)
      );

      // Preencher dados da empresa
      this.formGroup.patchValue({
        empresaData: {
          cnpj: cnpjData.cnpj,
          razaoSocial: cnpjData.razaoSocial,
          nomeFantasia: cnpjData.nomeFantasia,
          situacaoCadastral: cnpjData.situacaoCadastral
        }
      });

      // Buscar setor sugerido
      if (cnpjData.setorSugerido && cnpjData.setorSugerido.id) {
        try {
          const setorCompleto = await firstValueFrom(
            this.setorService.getSetorById(cnpjData.setorSugerido.id, true).pipe(
              catchError(() => of(null))
            )
          );

          if (setorCompleto) {
            this.setorSugerido = setorCompleto;
            this.cnpjConsultado.emit([setorCompleto]);
            this.showToast(`Setor sugerido: ${setorCompleto.nome}`, 'success');
          }
        } catch (error) {
          console.error('Erro ao buscar setor:', error);
        }
      }

      loading.dismiss();
      this.showToast('CNPJ consultado com sucesso!', 'success');
    } catch (error: any) {
      loading.dismiss();
      this.isConsultingCNPJ = false;
      
      let errorMessage = 'Erro ao consultar CNPJ. Tente novamente.';
      if (error.status === 404) {
        errorMessage = 'CNPJ não encontrado. Verifique se o CNPJ está correto.';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      }
      
      this.showToast(errorMessage, 'danger');
    } finally {
      this.isConsultingCNPJ = false;
    }
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}

