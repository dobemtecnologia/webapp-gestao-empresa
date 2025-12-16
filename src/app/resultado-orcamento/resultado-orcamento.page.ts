import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OrcamentoService } from '../services/orcamento.service';
import { OrcamentoDTO } from '../models/orcamento.model';
import { LoadingController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-resultado-orcamento',
  templateUrl: './resultado-orcamento.page.html',
  styleUrls: ['./resultado-orcamento.page.scss'],
  standalone: false,
})
export class ResultadoOrcamentoPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orcamentoService = inject(OrcamentoService);
  private loadingController = inject(LoadingController);
  private toastController = inject(ToastController);

  orcamento?: OrcamentoDTO;
  codigoHash?: string;
  linkCompartilhavel?: string;
  isLoading = false;

  ngOnInit() {
    this.codigoHash = this.route.snapshot.queryParams['hash'];
    if (this.codigoHash) {
      this.carregarOrcamento();
    } else {
      this.showToast('Hash do orçamento não encontrado.', 'danger');
      this.router.navigate(['/wizard']);
    }
  }

  async carregarOrcamento() {
    if (!this.codigoHash) return;

    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Carregando proposta...',
      spinner: 'crescent'
    });
    await loading.present();

    this.orcamentoService.getByHash(this.codigoHash).subscribe({
      next: (orcamento) => {
        loading.dismiss();
        this.isLoading = false;
        this.orcamento = orcamento;
        this.gerarLinkCompartilhavel();
      },
      error: (error) => {
        loading.dismiss();
        this.isLoading = false;
        let errorMessage = 'Erro ao carregar proposta.';
        if (error.status === 404) {
          errorMessage = 'Proposta não encontrada.';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        this.showToast(errorMessage, 'danger');
        this.router.navigate(['/wizard']);
      }
    });
  }

  private gerarLinkCompartilhavel() {
    if (this.codigoHash) {
      // TODO: Usar domínio configurável via environment
      this.linkCompartilhavel = `https://evah.io/proposta/${this.codigoHash}`;
    }
  }

  async copiarLink() {
    if (!this.linkCompartilhavel) return;

    try {
      await navigator.clipboard.writeText(this.linkCompartilhavel);
      this.showToast('Link copiado para a área de transferência!', 'success');
    } catch (error) {
      this.showToast('Erro ao copiar link.', 'danger');
    }
  }

  falarComVendedor() {
    // Abre WhatsApp com mensagem pré-formatada
    const mensagem = encodeURIComponent(
      `Olá! Gostaria de saber mais sobre a proposta ${this.codigoHash || ''}`
    );
    window.open(`https://wa.me/5511999999999?text=${mensagem}`, '_blank');
  }

  contratarAgora() {
    // TODO: Implementar fluxo de pagamento/assinatura
    this.showToast('Funcionalidade de contratação em desenvolvimento.', 'warning');
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

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  formatarData(data: string): string {
    if (!data) return '';
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR');
  }
}
