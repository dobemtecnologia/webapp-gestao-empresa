import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { WizardStateService } from '../../services/wizard-state.service';
import { PlanoService } from '../../services/plano.service';
import { Assistente } from '../../models/assistente.model';

@Component({
  selector: 'app-wizard-step-assistants',
  templateUrl: './wizard-step-assistants.component.html',
  styleUrls: ['./wizard-step-assistants.component.scss'],
  standalone: false,
})
export class WizardStepAssistantsComponent implements OnInit {
  wizardState = inject(WizardStateService);
  planoService = inject(PlanoService);
  private cdr = inject(ChangeDetectorRef);

  assistentes: Assistente[] = [];
  carregandoAssistentes = false;
  selectedSectors = this.wizardState.selectedSectors;
  assistants = this.wizardState.assistants;

  ngOnInit() {
    this.carregarAssistentes();
  }

  carregarAssistentes() {
    this.carregandoAssistentes = true;
    this.planoService.getAssistentes('id,asc').subscribe({
      next: (assistentes) => {
        this.assistentes = assistentes;
        this.carregandoAssistentes = false;
        this.inicializarAssistantes();
      },
      error: () => {
        this.carregandoAssistentes = false;
      }
    });
  }

  inicializarAssistantes() {
    const sectors = this.selectedSectors();
    
    // Adiciona assistentes que ainda não estão no estado
    this.assistentes.forEach(assistente => {
      sectors.forEach(sector => {
        const currentAssistants = this.assistants();
        const exists = currentAssistants.some(a => a.id === assistente.id && a.sector === sector);
        if (!exists) {
          this.wizardState.setAssistants([
            ...currentAssistants,
            { id: assistente.id, nome: assistente.nome, quantity: 0, sector }
          ]);
        }
      });
    });
  }

  incrementQuantity(assistantId: number, sector: string) {
    const current = this.assistants();
    const assistant = current.find(a => a.id === assistantId && a.sector === sector);
    
    if (assistant) {
      // Assistente existe, apenas incrementa
      this.wizardState.updateAssistantQuantity(assistantId, assistant.quantity + 1, sector);
    } else {
      // Assistente não existe, cria novo com quantidade 1
      const assistente = this.assistentes.find(a => a.id === assistantId);
      if (assistente) {
        this.wizardState.setAssistants([
          ...current,
          { id: assistantId, nome: assistente.nome, quantity: 1, sector }
        ]);
      }
    }
    // Força detecção de mudanças
    this.cdr.detectChanges();
  }

  decrementQuantity(assistantId: number, sector: string) {
    const current = this.assistants();
    const assistant = current.find(a => a.id === assistantId && a.sector === sector);
    if (assistant && assistant.quantity > 0) {
      const newQuantity = assistant.quantity - 1;
      if (newQuantity === 0) {
        // Remove o assistente se a quantidade chegar a 0
        this.wizardState.setAssistants(
          current.filter(a => !(a.id === assistantId && a.sector === sector))
        );
      } else {
        this.wizardState.updateAssistantQuantity(assistantId, newQuantity, sector);
      }
      // Força detecção de mudanças
      this.cdr.detectChanges();
    }
  }

  getQuantity(assistantId: number, sector: string): number {
    const assistant = this.assistants().find(a => a.id === assistantId && a.sector === sector);
    return assistant?.quantity || 0;
  }

  getAssistantsForSector(sector: string) {
    return this.assistentes;
  }
}
