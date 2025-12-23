import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OrcamentoService } from '../services/orcamento.service';
import { OrcamentoDTO, ItemOrcamentoDTO } from '../models/orcamento.model';
import { LoadingController, ToastController } from '@ionic/angular';

interface OrcamentoComItens {
  orcamento: OrcamentoDTO;
  itens: ItemOrcamentoDTO[];
}

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

  // Signals para reatividade
  private _orcamentoData = signal<OrcamentoComItens | null>(null);
  private _isLoading = signal<boolean>(false);
  private _codigoHash = signal<string | null>(null);

  // Computed signals
  readonly orcamento = computed(() => this._orcamentoData()?.orcamento);
  readonly itens = computed(() => this._orcamentoData()?.itens || []);
  readonly isLoading = computed(() => this._isLoading());
  readonly codigoHash = computed(() => this._codigoHash());

  // Valores calculados
  readonly totalSetup = computed(() => {
    const itens = this.itens();
    return itens.reduce((sum, item) => sum + (item.totalSetupFechado || 0), 0);
  });

  readonly linkCompartilhavel = computed(() => {
    const hash = this.codigoHash();
    if (!hash) return '';
    return `${window.location.origin}/resultado-orcamento?hash=${hash}`;
  });

  ngOnInit() {
    const hash = this.route.snapshot.queryParams['hash'];
    if (hash) {
      this._codigoHash.set(hash);
      this.carregarOrcamento();
    } else {
      this.showToast('Hash do orçamento não encontrado.', 'danger');
      this.router.navigate(['/wizard']);
    }
  }

  async carregarOrcamento() {
    const hash = this.codigoHash();
    if (!hash) return;

    this._isLoading.set(true);
    const loading = await this.loadingController.create({
      message: 'Carregando proposta...',
      spinner: 'crescent'
    });
    await loading.present();

    // Tenta buscar pelo endpoint customizado com hash
    this.orcamentoService.getByHashComItens(hash).subscribe({
      next: (data) => {
        loading.dismiss();
        this._isLoading.set(false);
        this._orcamentoData.set(data);
      },
      error: (error) => {
        // Fallback: Se o endpoint customizado não existir, tenta buscar pelo hash normal
        // e depois buscar os itens separadamente
        if (error.status === 404) {
          this.orcamentoService.getByHash(hash).subscribe({
            next: (orcamento) => {
              // Se o orçamento tiver itens já carregados, usa eles
              if (orcamento.itens && orcamento.itens.length > 0) {
                loading.dismiss();
                this._isLoading.set(false);
                this._orcamentoData.set({ orcamento, itens: orcamento.itens });
              } else {
                // Se não tiver itens, tenta buscar pelo ID
                if (orcamento.id) {
                  this.orcamentoService.getByIdComItens(orcamento.id).subscribe({
                    next: (data) => {
                      loading.dismiss();
                      this._isLoading.set(false);
                      this._orcamentoData.set(data);
                    },
                    error: (err) => {
                      loading.dismiss();
                      this._isLoading.set(false);
                      // Usa o orçamento sem itens como fallback
                      this._orcamentoData.set({ orcamento, itens: [] });
                    }
                  });
                } else {
                  loading.dismiss();
                  this._isLoading.set(false);
                  this._orcamentoData.set({ orcamento, itens: [] });
                }
              }
            },
            error: (err) => {
              loading.dismiss();
              this._isLoading.set(false);
              let errorMessage = 'Erro ao carregar proposta.';
              if (err.status === 404) {
                errorMessage = 'Proposta não encontrada.';
              } else if (err.error?.message) {
                errorMessage = err.error.message;
              }
              this.showToast(errorMessage, 'danger');
              this.router.navigate(['/wizard']);
            }
          });
        } else {
          loading.dismiss();
          this._isLoading.set(false);
          let errorMessage = 'Erro ao carregar proposta.';
          if (error.error?.message) {
            errorMessage = error.error.message;
          }
          this.showToast(errorMessage, 'danger');
          this.router.navigate(['/wizard']);
        }
      }
    });
  }

  async copiarLink() {
    const link = this.linkCompartilhavel();
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      this.showToast('Link copiado para a área de transferência!', 'success');
    } catch (error) {
      this.showToast('Erro ao copiar link.', 'danger');
    }
  }

  falarComConsultor() {
    const orcamento = this.orcamento();
    const hash = this.codigoHash();
    const nomeCliente = orcamento?.nomeCliente || orcamento?.nomeProspect || 'Cliente';
    
    const mensagem = encodeURIComponent(
      `Olá, gostaria de falar sobre o orçamento do ${nomeCliente} (Ref: ${hash})`
    );
    // TODO: Substituir pelo número real do WhatsApp
    window.open(`https://wa.me/5511999999999?text=${mensagem}`, '_blank');
  }

  aprovarEAtivar() {
    // TODO: Implementar lógica de aprovação
    this.showToast('Funcionalidade de aprovação em desenvolvimento.', 'warning');
  }

  editarProposta() {
    // Volta para o wizard preservando o estado
    this.router.navigate(['/wizard'], { 
      queryParams: { hash: this.codigoHash() } 
    });
  }

  getIconeTipoItem(tipoItem: string): string {
    switch (tipoItem) {
      case 'INFRAESTRUTURA':
        return 'server-outline';
      case 'ASSISTENTE':
        return 'robot-outline';
      case 'CANAL':
        return 'chatbubbles-outline';
      default:
        return 'cube-outline';
    }
  }

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
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
