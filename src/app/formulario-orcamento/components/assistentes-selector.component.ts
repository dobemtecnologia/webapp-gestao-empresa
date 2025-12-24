import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject, ChangeDetectorRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { PlanoService } from '../../services/plano.service';
import { Assistente } from '../../models/assistente.model';
import { SetorDTO } from '../../models/setor.model';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-assistentes-selector',
  templateUrl: './assistentes-selector.component.html',
  styleUrls: ['./assistentes-selector.component.scss'],
  standalone: false,
})
export class AssistentesSelectorComponent implements OnInit, OnChanges {
  @Input() formGroup!: FormGroup;
  @Output() assistentesChange = new EventEmitter<any[]>();

  private planoService = inject(PlanoService);
  private cdr = inject(ChangeDetectorRef);

  assistentesDisponiveis: Assistente[] = [];
  assistentesSelecionados: Array<{ id: number; nome: string; quantity: number; sector: string }> = [];
  carregando = false;
  setoresComAssistentes: Array<{ setor: SetorDTO; assistentes: Assistente[] }> = [];

  ngOnInit() {
    this.carregarAssistentes();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['formGroup'] && this.formGroup) {
      // Observa mudanças nos setores selecionados
      const setoresControl = this.formGroup.get('setores');
      if (setoresControl) {
        setoresControl.valueChanges.subscribe(() => {
          this.carregarAssistentes();
        });
      }
      
      // Carrega assistentes selecionados do formulário
      const assistentesValue = this.formGroup.get('assistentes')?.value || [];
      if (Array.isArray(assistentesValue) && assistentesValue.length > 0) {
        this.assistentesSelecionados = assistentesValue;
      }
    }
  }

  async carregarAssistentes() {
    const setores = this.formGroup.get('setores')?.value || [];
    
    if (!Array.isArray(setores) || setores.length === 0) {
      this.assistentesDisponiveis = [];
      this.setoresComAssistentes = [];
      this.cdr.detectChanges();
      return;
    }

    this.carregando = true;
    try {
      const setorIds: number[] = setores
        .map((s: SetorDTO) => {
          if (typeof s === 'number') return s;
          return s.id || null;
        })
        .filter((id: number | null): id is number => id !== null);
      
      if (setorIds.length === 0) {
        this.assistentesDisponiveis = [];
        this.setoresComAssistentes = [];
        this.cdr.detectChanges();
        return;
      }

      // Busca assistentes vinculados aos setores
      const assistentes = await firstValueFrom(
        this.planoService.getAssistentesPorSetores(setorIds).pipe(
          catchError((error) => {
            console.error('Erro ao carregar assistentes:', error);
            return of([]);
          })
        )
      );

      // Organiza assistentes por setor
      this.setoresComAssistentes = setores.map((setor: SetorDTO) => {
        let setorObj: SetorDTO;
        let setorId: number | null;
        
        if (typeof setor === 'object') {
          setorObj = setor;
          setorId = setor.id || null;
        } else {
          setorId = setor;
          setorObj = { id: setorId, nome: 'Setor' } as unknown as SetorDTO;
        }
        
        const assistentesDoSetor = assistentes.filter((assistente: any) => {
          const setoresDoAssistente = assistente.setors || assistente.setores || [];
          return setoresDoAssistente.some((s: any) => {
            const id = typeof s === 'object' ? s.id : s;
            return id === setorId;
          });
        });
        
        return {
          setor: setorObj,
          assistentes: assistentesDoSetor
        };
      });

      // Lista todos os assistentes disponíveis (sem duplicatas)
      const assistentesUnicos = new Map<number, Assistente>();
      assistentes.forEach((assistente: Assistente) => {
        if (!assistentesUnicos.has(assistente.id)) {
          assistentesUnicos.set(assistente.id, assistente);
        }
      });
      this.assistentesDisponiveis = Array.from(assistentesUnicos.values());

      // Inicializa assistentes selecionados se ainda não existirem
      if (this.assistentesSelecionados.length === 0) {
        this.inicializarAssistentesSelecionados();
      }

      this.cdr.detectChanges();
    } catch (error) {
      console.error('Erro ao carregar assistentes:', error);
    } finally {
      this.carregando = false;
    }
  }

  private inicializarAssistentesSelecionados() {
    // Inicializa com quantidade 0 para todos os assistentes disponíveis
    this.assistentesSelecionados = this.setoresComAssistentes.reduce((acc: Array<{ id: number; nome: string; quantity: number; sector: string }>, item: { setor: SetorDTO; assistentes: Assistente[] }) => {
      const assistentesDoSetor = item.assistentes.map(assistente => ({
        id: assistente.id,
        nome: assistente.nome || 'Assistente',
        quantity: 0,
        sector: item.setor.nome || 'Setor'
      }));
      return acc.concat(assistentesDoSetor);
    }, []);
    
    // Remove duplicatas mantendo apenas o primeiro
    const unicos = new Map<number, any>();
    this.assistentesSelecionados.forEach(a => {
      const key = `${a.id}-${a.sector}`;
      if (!unicos.has(a.id)) {
        unicos.set(a.id, a);
      }
    });
    this.assistentesSelecionados = Array.from(unicos.values());
    
    this.atualizarFormulario();
  }

  getAssistentesPorSetor(setorNome: string): Assistente[] {
    const item = this.setoresComAssistentes.find(item => item.setor.nome === setorNome);
    return item ? item.assistentes : [];
  }

  incrementQuantity(assistantId: number, sector: string) {
    const existing = this.assistentesSelecionados.find(a => a.id === assistantId && a.sector === sector);
    
    if (existing) {
      existing.quantity += 1;
    } else {
      const assistente = this.assistentesDisponiveis.find(a => a.id === assistantId);
      if (assistente) {
        this.assistentesSelecionados.push({
          id: assistantId,
          nome: assistente.nome || 'Assistente',
          quantity: 1,
          sector
        });
      }
    }
    
    this.atualizarFormulario();
    this.cdr.detectChanges();
  }

  decrementQuantity(assistantId: number, sector: string) {
    const existing = this.assistentesSelecionados.find(a => a.id === assistantId && a.sector === sector);
    
    if (existing) {
      existing.quantity = Math.max(0, existing.quantity - 1);
      
      // Remove se quantidade for 0
      if (existing.quantity === 0) {
        this.assistentesSelecionados = this.assistentesSelecionados.filter(
          a => !(a.id === assistantId && a.sector === sector)
        );
      }
    }
    
    this.atualizarFormulario();
    this.cdr.detectChanges();
  }

  getQuantity(assistantId: number, sector: string): number {
    const assistant = this.assistentesSelecionados.find(a => a.id === assistantId && a.sector === sector);
    return assistant?.quantity || 0;
  }

  private atualizarFormulario() {
    // Atualiza o formulário com os assistentes selecionados
    this.formGroup.patchValue({ assistentes: this.assistentesSelecionados });
    this.assistentesChange.emit(this.assistentesSelecionados);
  }
}
