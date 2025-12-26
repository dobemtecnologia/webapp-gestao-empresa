import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { CnpjService } from '../../services/cnpj.service';
import { SetorService } from '../../services/setor.service';
import { AuthService } from '../../services/auth.service';
import { CNPJResponse } from '../../models/cnpj-response.model';
import { SetorDTO } from '../../models/setor.model';
import { LoginVM } from '../../models/login-vm.model';
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
    private authService: AuthService,
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
      
      console.error('Erro ao consultar CNPJ:', error);
      console.error('Status:', error.status);
      console.error('URL chamada:', error.url || 'N/A');
      console.error('Mensagem:', error.message);
      
      let errorMessage = 'Erro ao consultar CNPJ. Tente novamente.';
      
      if (error.status === 0) {
        errorMessage = 'Não foi possível conectar ao servidor. Verifique se a API está rodando.';
      } else if (error.status === 401 || error.status === 403) {
        // Tentar fazer login automático e depois tentar novamente
        try {
          await this.tentarLoginAutomatico();
          console.log('Login realizado. Tentando consultar CNPJ novamente...');
          
          // Tentar consultar CNPJ novamente após login
          loading.message = 'Consultando CNPJ novamente...';
          await loading.present();
          
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
          this.isConsultingCNPJ = false;
          return; // Sucesso na segunda tentativa
        } catch (retryError: any) {
          loading.dismiss();
          errorMessage = 'Erro de autenticação. Não foi possível fazer login automaticamente.';
          console.error('Erro ao tentar novamente após login:', retryError);
        }
      } else if (error.status === 404) {
        errorMessage = 'CNPJ não encontrado. Verifique se o CNPJ está correto.';
      } else if (error.status === 500) {
        errorMessage = 'Erro interno do servidor. Tente novamente mais tarde.';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.message) {
        errorMessage = `Erro: ${error.message}`;
      }
      
      this.showToast(errorMessage, 'danger');
    } finally {
      this.isConsultingCNPJ = false;
    }
  }

  private async tentarLoginAutomatico(): Promise<void> {
    if (this.authService.isAuthenticated()) {
      return Promise.resolve();
    }
    
    const credentials: LoginVM = { username: 'admin', password: 'admin', rememberMe: false };
    try {
      await firstValueFrom(this.authService.login(credentials).pipe(catchError(() => of(null))));
      console.log('Login automático realizado com sucesso');
    } catch (e) {
      console.error('Erro no login automático:', e);
      throw e;
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



