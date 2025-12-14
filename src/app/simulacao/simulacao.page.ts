import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { LoadingController, ToastController } from '@ionic/angular';
import { PlanoService } from '../services/plano.service';
import { PlanoBlueprint } from '../models/plano-blueprint.model';
import { ItemBlueprint } from '../models/item-blueprint.model';
import { PlanoSimulacaoResponse } from '../models/plano-simulacao-response.model';
import { Infraestrutura } from '../models/infraestrutura.model';

@Component({
  selector: 'app-simulacao',
  templateUrl: './simulacao.page.html',
  styleUrls: ['./simulacao.page.scss'],
  standalone: false,
})
export class SimulacaoPage implements OnInit {
  simulacaoForm!: FormGroup;
  resultadoSimulacao?: PlanoSimulacaoResponse;
  isLoading = false;
  tiposItem = ['INFRAESTRUTURA', 'ASSISTENTE', 'CANAL', 'PACOTE_CREDITOS'];
  infraestruturas: Infraestrutura[] = [];
  carregandoInfraestruturas = false;

  constructor(
    private formBuilder: FormBuilder,
    private planoService: PlanoService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.initForm();
    this.carregarInfraestruturas();
  }

  initForm() {
    this.simulacaoForm = this.formBuilder.group({
      nomePlano: ['', [Validators.required]],
      itens: this.formBuilder.array([this.createItemFormGroup()]),
      consumoEstimado: this.formBuilder.group({
        tokensOpenAi: [0, [Validators.required, Validators.min(0)]],
        mensagensWhatsapp: [0, [Validators.required, Validators.min(0)]]
      })
    });
  }

  createItemFormGroup(): FormGroup {
    return this.formBuilder.group({
      tipoItem: ['INFRAESTRUTURA', [Validators.required]],
      referenciaId: [null, [Validators.required, Validators.min(1)]],
      quantidade: [1, [Validators.required, Validators.min(1)]]
    });
  }

  get itensFormArray(): FormArray {
    return this.simulacaoForm.get('itens') as FormArray;
  }

  get consumoEstimadoFormGroup(): FormGroup {
    return this.simulacaoForm.get('consumoEstimado') as FormGroup;
  }

  adicionarItem() {
    this.itensFormArray.push(this.createItemFormGroup());
  }

  removerItem(index: number) {
    if (this.itensFormArray.length > 1) {
      this.itensFormArray.removeAt(index);
    }
  }

  carregarInfraestruturas() {
    this.carregandoInfraestruturas = true;
    this.planoService.getInfraestruturas('id,asc').subscribe({
      next: (infraestruturas) => {
        this.infraestruturas = infraestruturas;
        this.carregandoInfraestruturas = false;
      },
      error: (error) => {
        this.carregandoInfraestruturas = false;
        console.error('Erro ao carregar infraestruturas:', error);
        this.showToast('Erro ao carregar opções de infraestrutura.', 'danger');
      }
    });
  }

  onTipoItemChange(index: number) {
    const itemControl = this.itensFormArray.at(index);
    const tipoItem = itemControl.get('tipoItem')?.value;
    
    // Limpa o referenciaId quando o tipo muda
    itemControl.get('referenciaId')?.setValue(null);
    
    // Se for INFRAESTRUTURA e ainda não carregou, carrega
    if (tipoItem === 'INFRAESTRUTURA' && this.infraestruturas.length === 0) {
      this.carregarInfraestruturas();
    }
  }

  isTipoInfraestrutura(index: number): boolean {
    const itemControl = this.itensFormArray.at(index);
    return itemControl.get('tipoItem')?.value === 'INFRAESTRUTURA';
  }

  async onSubmit() {
    if (this.simulacaoForm.valid && !this.isLoading) {
      this.isLoading = true;

      const loading = await this.loadingController.create({
        message: 'Simulando plano...',
        spinner: 'crescent'
      });
      await loading.present();

      const planoBlueprint: PlanoBlueprint = {
        nomePlano: this.simulacaoForm.value.nomePlano,
        itens: this.simulacaoForm.value.itens.map((item: any) => ({
          tipoItem: item.tipoItem,
          referenciaId: Number(item.referenciaId),
          quantidade: Number(item.quantidade)
        })),
        consumoEstimado: {
          tokensOpenAi: Number(this.simulacaoForm.value.consumoEstimado.tokensOpenAi),
          mensagensWhatsapp: Number(this.simulacaoForm.value.consumoEstimado.mensagensWhatsapp)
        }
      };

      this.planoService.simularGeracao(planoBlueprint).subscribe({
        next: (response) => {
          loading.dismiss();
          this.isLoading = false;
          this.resultadoSimulacao = response;
          this.showToast('Simulação realizada com sucesso!', 'success');
        },
        error: (error) => {
          loading.dismiss();
          this.isLoading = false;
          
          let errorMessage = 'Erro ao simular plano. Tente novamente.';
          
          if (error.status === 400) {
            errorMessage = 'Dados inválidos. Verifique os campos preenchidos.';
          } else if (error.status === 401) {
            errorMessage = 'Não autorizado. Faça login novamente.';
          } else if (error.status === 0) {
            errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão.';
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          }
          
          this.showToast(errorMessage, 'danger');
        }
      });
    } else {
      this.markFormGroupTouched();
      this.showToast('Por favor, preencha todos os campos obrigatórios corretamente.', 'warning');
    }
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      color: color,
      position: 'top'
    });
    await toast.present();
  }

  private markFormGroupTouched() {
    Object.keys(this.simulacaoForm.controls).forEach(key => {
      const control = this.simulacaoForm.get(key);
      control?.markAsTouched();
      
      if (control instanceof FormArray) {
        control.controls.forEach(itemControl => {
          if (itemControl instanceof FormGroup) {
            Object.keys(itemControl.controls).forEach(itemKey => {
              itemControl.get(itemKey)?.markAsTouched();
            });
          }
        });
      } else if (control instanceof FormGroup) {
        Object.keys(control.controls).forEach(groupKey => {
          control.get(groupKey)?.markAsTouched();
        });
      }
    });
  }

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }
}
