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

  ngOnInit() {
    this.carregarCanals();
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
}
