import { Component, OnInit, inject, signal, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PlanoService } from '../services/plano.service';
import { Assistente } from '../models/assistente.model';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-modal-adicionar-assistente',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Adicionar Assistente</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="fechar()">Fechar</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      @if (carregando) {
        <div class="loading-container">
          <ion-spinner></ion-spinner>
          <p>Carregando assistentes...</p>
        </div>
      } @else {
        <div class="assistantes-list">
          @for (assistente of assistentesDisponiveis(); track assistente.id) {
            <ion-item button (click)="selecionarAssistente(assistente)">
              <ion-icon name="people-outline" slot="start"></ion-icon>
              <ion-label>
                <h3>{{ assistente.nome }}</h3>
                @if (assistente.descricao) {
                  <p>{{ assistente.descricao }}</p>
                }
              </ion-label>
              <ion-button slot="end" fill="clear">
                <ion-icon name="add-circle-outline"></ion-icon>
              </ion-button>
            </ion-item>
          }
        </div>
      }
    </ion-content>
  `,
  standalone: false
})
export class ModalAdicionarAssistenteComponent implements OnInit {
  private modalController = inject(ModalController);
  private planoService = inject(PlanoService);

  @Input() assistentesAtuais: number[] = []; // IDs dos assistentes já no orçamento
  @Input() setorIds: number[] = []; // IDs dos setores para filtrar assistentes

  assistentesDisponiveis = signal<Assistente[]>([]);
  carregando = true;

  async ngOnInit() {
    try {
      let assistentes: Assistente[] = [];

      if (this.setorIds && this.setorIds.length > 0) {
        // Busca assistentes dos setores específicos
        assistentes = await firstValueFrom(
          this.planoService.getAssistentesPorSetores(this.setorIds).pipe(catchError(() => of([])))
        );
      } else {
        // Busca todos os assistentes
        assistentes = await firstValueFrom(
          this.planoService.getAssistentes('id,asc', true).pipe(catchError(() => of([])))
        );
      }

      // Filtra assistentes que já estão no orçamento (opcional - pode mostrar todos)
      // const assistentesFiltrados = assistentes.filter(a => !this.assistentesAtuais.includes(a.id));
      
      this.assistentesDisponiveis.set(assistentes);
      this.carregando = false;
    } catch (error) {
      console.error('Erro ao carregar assistentes:', error);
      this.carregando = false;
    }
  }

  selecionarAssistente(assistente: Assistente) {
    this.modalController.dismiss({ assistente, quantidade: 1 });
  }

  fechar() {
    this.modalController.dismiss();
  }
}

