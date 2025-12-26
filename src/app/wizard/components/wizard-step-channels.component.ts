import { Component, OnInit, inject } from '@angular/core';
import { WizardStateService } from '../../services/wizard-state.service';
import { PlanoService } from '../../services/plano.service';
import { Canal } from '../../models/canal.model';

@Component({
  selector: 'app-wizard-step-channels',
  templateUrl: './wizard-step-channels.component.html',
  styleUrls: ['./wizard-step-channels.component.scss'],
  standalone: false,
})
export class WizardStepChannelsComponent implements OnInit {
  wizardState = inject(WizardStateService);
  planoService = inject(PlanoService);

  canals: Canal[] = [];
  carregandoCanals = false;
  channels = this.wizardState.channels;
  assistants = this.wizardState.assistants;
  assistantChannels = this.wizardState.assistantChannels;
  selectedSectors = this.wizardState.selectedSectors;
  availableAgentes = this.wizardState.availableAgentes;

  ngOnInit() {
    this.carregarCanals();
    // Garante que os nomes dos assistentes estejam atualizados
    this.enriquecerAssistentesComDetalhes();
  }

  private enriquecerAssistentesComDetalhes() {
    const assistentes = this.assistants().filter(a => a.quantity > 0);
    const assistentesParaBuscar = new Set<number>();
    
    // Identifica assistentes que precisam ter seus detalhes buscados
    assistentes.forEach(assistant => {
      if (!assistant.nome || assistant.nome.trim() === '' || 
          assistant.nome === 'Assistente Personalizado' || 
          assistant.nome === 'Assistente especializado' ||
          assistant.nome === 'Assistente') {
        assistentesParaBuscar.add(assistant.id);
      }
    });

    // Busca detalhes completos dos assistentes que precisam
    if (assistentesParaBuscar.size > 0) {
      // Usa endpoint por setores se houver setores selecionados
      const setoresIds = this.selectedSectors().map(s => s.id);
      const assistentesObservable = setoresIds.length > 0
        ? this.planoService.getAssistentesPorSetores(setoresIds)
        : this.planoService.getAssistentes('id,asc');
      
      assistentesObservable.subscribe({
        next: (assistentesCompletos) => {
          // Atualiza os assistentes no estado com os nomes corretos
          const currentAssistants = this.assistants();
          const updatedAssistants = currentAssistants.map(assistant => {
            if (assistentesParaBuscar.has(assistant.id)) {
              const assistenteCompleto = assistentesCompletos.find(a => a.id === assistant.id);
              if (assistenteCompleto && assistenteCompleto.nome && assistenteCompleto.nome.trim() !== '') {
                return { ...assistant, nome: assistenteCompleto.nome };
              }
            }
            return assistant;
          });
          this.wizardState.setAssistants(updatedAssistants);
        },
        error: (error) => {
          console.error('Erro ao buscar detalhes dos assistentes:', error);
        }
      });
    }
  }

  carregarCanals() {
    this.carregandoCanals = true;
    this.planoService.getCanals('id,asc').subscribe({
      next: (canals) => {
        this.canals = canals;
        // Mantém a lista de canais disponíveis no estado (sem mais flag global de enabled)
        const currentChannels = this.channels();
        const newChannels = canals.map(canal => {
          const existing = currentChannels.find(ch => ch.id === canal.id);
          return existing || { id: canal.id, nome: canal.nome, enabled: false };
        });
        this.wizardState.setChannels(newChannels);
        this.carregandoCanals = false;
      },
      error: () => {
        this.carregandoCanals = false;
      }
    });
  }

  toggleAssistantChannel(assistantId: number, channelId: number) {
    this.wizardState.toggleAssistantChannel(assistantId, channelId);
  }

  isChannelEnabledForAssistant(assistantId: number, channelId: number): boolean {
    return this.assistantChannels().some(
      ac => ac.assistantId === assistantId && ac.channelId === channelId && ac.enabled
    );
  }

  getChannelIcon(nome: string): string {
    const nomeLower = nome.toLowerCase();
    if (nomeLower.includes('whatsapp')) return 'logo-whatsapp';
    if (nomeLower.includes('instagram')) return 'logo-instagram';
    if (nomeLower.includes('web')) return 'globe-outline';
    if (nomeLower.includes('api')) return 'code-outline';
    return 'chatbubble-outline';
  }

  // Obtém os agentes do setor ao qual o assistente pertence
  getAgentesForAssistant(assistantId: number, sectorNome: string): any[] {
    const setor = this.selectedSectors().find(s => s.nome === sectorNome);
    if (setor && setor.agentes && Array.isArray(setor.agentes)) {
      // Retorna apenas agentes ativos
      return setor.agentes.filter(agente => agente.ativo !== false);
    }
    return [];
  }

  // Obtém o nome do assistente completo
  getAssistantName(assistantId: number, sectorNome: string): string {
    // Primeiro tenta buscar no estado atual
    const assistant = this.assistants().find(a => a.id === assistantId && a.sector === sectorNome);
    if (assistant && assistant.nome && assistant.nome.trim() !== '' && assistant.nome !== 'Assistente Personalizado' && assistant.nome !== 'Assistente especializado') {
      return assistant.nome;
    }
    
    // Se não encontrou ou nome está vazio, busca nos setores selecionados
    const setor = this.selectedSectors().find(s => s.nome === sectorNome);
    if (setor && setor.assistentes) {
      const assistenteDoSetor = setor.assistentes.find(a => a.id === assistantId);
      if (assistenteDoSetor && assistenteDoSetor.nome && assistenteDoSetor.nome.trim() !== '') {
        return assistenteDoSetor.nome;
      }
    }
    
    // Última tentativa: busca no computed signal de assistentes disponíveis
    const available = this.wizardState.availableAssistants();
    const found = available.find(a => a.id === assistantId);
    if (found && found.nome && found.nome.trim() !== '') {
      return found.nome;
    }
    
    return `Assistente ID ${assistantId}`;
  }

  // Formata a lista de nomes dos agentes como string
  getAgentesNamesString(assistantId: number, sectorNome: string): string {
    const agentes = this.getAgentesForAssistant(assistantId, sectorNome);
    if (agentes.length === 0) {
      return '';
    }
    return agentes.map(a => a.nome).join(', ');
  }

  // Retorna apenas assistentes com quantity > 0
  getActiveAssistants() {
    return this.assistants().filter(a => a.quantity > 0);
  }

  // Verifica se há assistentes ativos
  hasActiveAssistants(): boolean {
    return this.getActiveAssistants().length > 0;
  }
}
