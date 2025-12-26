import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { WizardStateService } from '../../services/wizard-state.service';
import { PlanoService } from '../../services/plano.service';
import { SetorService } from '../../services/setor.service';
import { Assistente } from '../../models/assistente.model';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-wizard-step-assistants',
  templateUrl: './wizard-step-assistants.component.html',
  styleUrls: ['./wizard-step-assistants.component.scss'],
  standalone: false,
})
export class WizardStepAssistantsComponent implements OnInit {
  wizardState = inject(WizardStateService);
  planoService = inject(PlanoService);
  setorService = inject(SetorService);
  private cdr = inject(ChangeDetectorRef);

  // Usa o computed signal que retorna assistentes consolidados dos setores selecionados
  availableAssistants = this.wizardState.availableAssistants;
  selectedSectors = this.wizardState.selectedSectors;
  assistants = this.wizardState.assistants;

  async ngOnInit() {
    // Verifica se os setores estão vazios ou sem assistentes
    const setores = this.selectedSectors();
    if (setores.length === 0 || setores.some(s => !s.assistentes || s.assistentes.length === 0)) {
      console.log('⚠️ Setores vazios ou sem assistentes. Buscando da API...');
      await this.carregarSetoresComAssistentes();
    }
    
    // Não precisa mais carregar da API, usa os assistentes dos setores selecionados
    this.inicializarAssistantes();
    // Se os assistentes vierem sem nome completo, busca os detalhes
    this.enriquecerAssistentesComDetalhes();
  }

  private async carregarSetoresComAssistentes() {
    try {
      // Pega os IDs dos setores que já estão selecionados no estado
      const setoresAtuais = this.selectedSectors();
      const setoresIds = setoresAtuais.map(s => s.id);

      if (setoresIds.length === 0) {
        console.warn('⚠️ Nenhum setor selecionado no estado');
        return;
      }

      console.log(`🔍 Buscando assistentes para ${setoresIds.length} setor(es):`, setoresIds);

      // Busca os assistentes vinculados aos setores usando o endpoint customizado
      const assistentes = await firstValueFrom(
        this.planoService.getAssistentesPorSetores(setoresIds).pipe(catchError(() => of([])))
      );

      console.log(`✅ ${assistentes.length} assistente(s) encontrado(s) para os setores informados`);

      // Cria um mapa de setorId -> assistentes[] para associar os assistentes aos setores corretos
      const assistentesPorSetor = new Map<number, any[]>();

      assistentes.forEach((assistente: any) => {
        // Os assistentes têm uma propriedade 'setors' ou 'setores' que indica a quais setores pertencem
        const setoresDoAssistente = (assistente.setors || assistente.setores || []) as any[];
        
        setoresDoAssistente.forEach((setorRef: any) => {
          const setorId = typeof setorRef === 'object' ? setorRef.id : setorRef;
          
          // Só adiciona se o setor estiver na lista de setores selecionados
          if (setoresIds.includes(setorId)) {
            if (!assistentesPorSetor.has(setorId)) {
              assistentesPorSetor.set(setorId, []);
            }
            assistentesPorSetor.get(setorId)!.push(assistente);
          }
        });
      });

      // Atualiza cada setor com seus assistentes correspondentes
      const setoresAtualizados = setoresAtuais.map(setor => {
        const assistentesDoSetor = assistentesPorSetor.get(setor.id) || [];
        
        if (assistentesDoSetor.length > 0) {
          console.log(`✅ Setor ${setor.nome} (ID: ${setor.id}) atualizado com ${assistentesDoSetor.length} assistente(s)`);
          return {
            ...setor,
            assistentes: assistentesDoSetor
          };
        } else {
          console.warn(`⚠️ Setor ${setor.nome} (ID: ${setor.id}) não possui assistentes vinculados`);
          return setor;
        }
      });

      // Atualiza o estado com os setores completos (com assistentes)
      // IMPORTANTE: As quantidades dos assistentes já estão preservadas no estado (this.assistants())
      // porque o método inicializarAssistantes() só adiciona assistentes novos se não existirem
      // Portanto, as quantidades do orçamento ou Firebase são mantidas automaticamente
      this.wizardState.setSelectedSectors(setoresAtualizados);
      this.cdr.detectChanges();

      console.log('✅ Setores atualizados com assistentes carregados. As quantidades existentes no estado são preservadas.');
    } catch (error) {
      console.error('❌ Erro ao carregar assistentes por setores:', error);
    }
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
      // Usa endpoint por setores se houver setores selecionados
      const setoresIds = setores.map(s => s.id);
      const assistentesObservable = setoresIds.length > 0
        ? this.planoService.getAssistentesPorSetores(setoresIds)
        : this.planoService.getAssistentes('id,asc');
      
      assistentesObservable.subscribe({
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
