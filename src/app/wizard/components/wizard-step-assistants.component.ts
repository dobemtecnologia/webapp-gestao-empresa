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

  // Usa o computed signal que retorna assistentes consolidados dos setores selecionados
  availableAssistants = this.wizardState.availableAssistants;
  selectedSectors = this.wizardState.selectedSectors;
  assistants = this.wizardState.assistants;

  ngOnInit() {
    // Não precisa mais carregar da API, usa os assistentes dos setores selecionados
    this.inicializarAssistantes();
    // Se os assistentes vierem sem nome completo, busca os detalhes
    this.enriquecerAssistentesComDetalhes();
  }

  private enriquecerAssistentesComDetalhes() {
    const setores = this.selectedSectors();
    const assistentesParaBuscar = new Set<number>();
    
    // Identifica assistentes que precisam ter seus detalhes buscados
    setores.forEach(setor => {
      if (setor.assistentes && Array.isArray(setor.assistentes)) {
        setor.assistentes.forEach(assistente => {
          // Se o assistente não tem nome ou nome está vazio, precisa buscar detalhes
          if (!assistente.nome || assistente.nome.trim() === '' || assistente.nome === 'Assistente Personalizado' || assistente.nome === 'Assistente especializado') {
            assistentesParaBuscar.add(assistente.id);
          }
        });
      }
    });

    // Busca detalhes completos dos assistentes que precisam
    if (assistentesParaBuscar.size > 0) {
      this.planoService.getAssistentes('id,asc').subscribe({
        next: (assistentesCompletos) => {
          // Atualiza os assistentes nos setores com os nomes corretos
          setores.forEach(setor => {
            if (setor.assistentes && Array.isArray(setor.assistentes)) {
              setor.assistentes.forEach(assistente => {
                if (assistentesParaBuscar.has(assistente.id)) {
                  const assistenteCompleto = assistentesCompletos.find(a => a.id === assistente.id);
                  if (assistenteCompleto && assistenteCompleto.nome) {
                    assistente.nome = assistenteCompleto.nome;
                    // Atualiza também outros campos se necessário
                    if (assistenteCompleto.descricao && !assistente.descricao) {
                      assistente.descricao = assistenteCompleto.descricao;
                    }
                  }
                }
              });
            }
          });
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Erro ao buscar detalhes dos assistentes:', error);
        }
      });
    }
  }

  inicializarAssistantes() {
    const setores = this.selectedSectors();
    const assistentesDisponiveis = this.availableAssistants();
    
    // Adiciona assistentes que ainda não estão no estado
    assistentesDisponiveis.forEach(assistente => {
      // Encontra o setor ao qual este assistente pertence
      const setorDoAssistente = setores.find(setor => 
        setor.assistentes?.some(a => a.id === assistente.id)
      );
      
      if (setorDoAssistente) {
        const sectorNome = setorDoAssistente.nome;
        const currentAssistants = this.assistants();
        const exists = currentAssistants.some(a => a.id === assistente.id && a.sector === sectorNome);
        if (!exists) {
          this.wizardState.setAssistants([
            ...currentAssistants,
            { id: assistente.id, nome: assistente.nome, quantity: 0, sector: sectorNome }
          ]);
        }
      }
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
      const assistente = this.availableAssistants().find((a: any) => a.id === assistantId);
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

  getAssistantsForSector(sectorNome: string) {
    // Retorna apenas assistentes que pertencem ao setor especificado
    const setor = this.selectedSectors().find(s => s.nome === sectorNome);
    if (setor && setor.assistentes) {
      return setor.assistentes;
    }
    return [];
  }
}
