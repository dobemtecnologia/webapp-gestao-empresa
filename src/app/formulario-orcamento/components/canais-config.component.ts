import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject, ChangeDetectorRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { PlanoService } from '../../services/plano.service';
import { Canal } from '../../models/canal.model';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-canais-config',
  templateUrl: './canais-config.component.html',
  styleUrls: ['./canais-config.component.scss'],
  standalone: false,
})
export class CanaisConfigComponent implements OnInit, OnChanges {
  @Input() formGroup!: FormGroup;
  @Output() canaisChange = new EventEmitter<{ canais: any[]; assistantChannels: any[] }>();

  private planoService = inject(PlanoService);
  private cdr = inject(ChangeDetectorRef);

  canals: Canal[] = [];
  carregandoCanals = false;
  assistantChannels: Array<{ assistantId: number; channelId: number; enabled: boolean }> = [];

  ngOnInit() {
    this.carregarCanals();
    this.inicializarAssistantChannels();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['formGroup'] && this.formGroup) {
      // Observa mudanças nos assistentes selecionados
      const assistentesControl = this.formGroup.get('assistentes');
      if (assistentesControl) {
        assistentesControl.valueChanges.subscribe(() => {
          this.inicializarAssistantChannels();
        });
      }
      
      // Carrega assistantChannels do formulário se existirem
      const assistantChannelsValue = this.formGroup.get('assistantChannels')?.value || [];
      if (Array.isArray(assistantChannelsValue) && assistantChannelsValue.length > 0) {
        this.assistantChannels = assistantChannelsValue;
      }
    }
  }

  async carregarCanals() {
    this.carregandoCanals = true;
    try {
      const canals = await firstValueFrom(
        this.planoService.getCanals('id,asc').pipe(
          catchError((error) => {
            console.error('Erro ao carregar canais:', error);
            return of([]);
          })
        )
      );
      this.canals = canals;
      this.cdr.detectChanges();
    } finally {
      this.carregandoCanals = false;
    }
  }

  private inicializarAssistantChannels() {
    const assistentes = this.formGroup.get('assistentes')?.value || [];
    const assistentesAtivos = assistentes.filter((a: any) => a.quantity > 0);
    
    // Inicializa assistantChannels para cada assistente ativo e cada canal disponível
    const novosAssistantChannels: Array<{ assistantId: number; channelId: number; enabled: boolean }> = [];
    
    assistentesAtivos.forEach((assistente: any) => {
      this.canals.forEach((canal) => {
        // Verifica se já existe uma configuração para este assistente e canal
        const existente = this.assistantChannels.find(
          ac => ac.assistantId === assistente.id && ac.channelId === canal.id
        );
        
        if (existente) {
          novosAssistantChannels.push(existente);
        } else {
          // Cria nova configuração desabilitada por padrão
          novosAssistantChannels.push({
            assistantId: assistente.id,
            channelId: canal.id,
            enabled: false
          });
        }
      });
    });
    
    // Remove configurações de assistentes que não estão mais ativos
    const assistentesIdsAtivos = assistentesAtivos.map((a: any) => a.id);
    this.assistantChannels = this.assistantChannels.filter(
      ac => assistentesIdsAtivos.includes(ac.assistantId)
    );
    
    // Adiciona novas configurações
    novosAssistantChannels.forEach(novo => {
      const existe = this.assistantChannels.some(
        ac => ac.assistantId === novo.assistantId && ac.channelId === novo.channelId
      );
      if (!existe) {
        this.assistantChannels.push(novo);
      }
    });
    
    this.atualizarFormulario();
  }

  toggleAssistantChannel(assistantId: number, channelId: number) {
    const index = this.assistantChannels.findIndex(
      ac => ac.assistantId === assistantId && ac.channelId === channelId
    );
    
    if (index >= 0) {
      this.assistantChannels[index].enabled = !this.assistantChannels[index].enabled;
    } else {
      // Se não existe, cria nova configuração
      this.assistantChannels.push({
        assistantId,
        channelId,
        enabled: true
      });
    }
    
    this.atualizarFormulario();
    this.cdr.detectChanges();
  }

  isChannelEnabledForAssistant(assistantId: number, channelId: number): boolean {
    return this.assistantChannels.some(
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

  getActiveAssistants() {
    const assistentes = this.formGroup.get('assistentes')?.value || [];
    return assistentes.filter((a: any) => a.quantity > 0);
  }

  hasActiveAssistants(): boolean {
    return this.getActiveAssistants().length > 0;
  }

  getAssistantName(assistente: any): string {
    return assistente.nome || `Assistente ID ${assistente.id}`;
  }

  private atualizarFormulario() {
    // Atualiza o formulário com os assistantChannels
    const canais = this.canals.map(canal => ({
      id: canal.id,
      nome: canal.nome
    }));
    
    this.formGroup.patchValue({ 
      canais,
      assistantChannels: this.assistantChannels 
    });
    
    this.canaisChange.emit({
      canais,
      assistantChannels: this.assistantChannels
    });
  }
}
