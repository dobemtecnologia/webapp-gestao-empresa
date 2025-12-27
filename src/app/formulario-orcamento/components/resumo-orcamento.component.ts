import { Component, Input, OnInit, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { PlanoSimulacaoResponse } from '../../models/plano-simulacao-response.model';
import { PlanoService } from '../../services/plano.service';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PeriodoContratacao } from '../../models/periodo-contratacao.model';
import { Infraestrutura } from '../../models/infraestrutura.model';

@Component({
  selector: 'app-resumo-orcamento',
  templateUrl: './resumo-orcamento.component.html',
  styleUrls: ['./resumo-orcamento.component.scss'],
  standalone: false,
})
export class ResumoOrcamentoComponent implements OnInit {
  @Input() formulario!: FormGroup;
  @Input() resultadoSimulacao?: PlanoSimulacaoResponse;

  private planoService = inject(PlanoService);
  
  periodoData?: PeriodoContratacao;
  infraestruturaData?: Infraestrutura;
  valorComDesconto?: number;
  percentualDesconto?: number;

  async ngOnInit() {
    await this.carregarDadosAdicionais();
  }

  private async carregarDadosAdicionais() {
    // Carregar período
    const periodoCodigo = this.formulario.get('selectedPeriod')?.value;
    if (periodoCodigo) {
      try {
        const periodos = await firstValueFrom(
          this.planoService.getPeriodosContratacao('id,asc').pipe(
            catchError(() => of([]))
          )
        );
        this.periodoData = periodos.find(p => p.codigo === periodoCodigo && p.ativo);
        
        // Calcular valor com desconto
        if (this.periodoData && this.resultadoSimulacao) {
          const baseMensal = this.resultadoSimulacao.valorMensalTotal;
          if (this.periodoData.tipoDesconto === 'PERCENTUAL' && this.periodoData.valorDesconto > 0) {
            this.percentualDesconto = this.periodoData.valorDesconto;
            this.valorComDesconto = baseMensal * (1 - this.percentualDesconto / 100);
          } else if (this.periodoData.tipoDesconto === 'VALOR_FIXO' && this.periodoData.valorDesconto > 0) {
            this.valorComDesconto = Math.max(baseMensal - this.periodoData.valorDesconto, 0);
            this.percentualDesconto = (this.periodoData.valorDesconto / baseMensal) * 100;
          }
        }
      } catch (error) {
        console.error('Erro ao carregar período:', error);
      }
    }

    // Carregar infraestrutura
    const infrastructureId = this.formulario.get('infrastructure')?.value;
    if (infrastructureId) {
      try {
        const infraestruturas = await firstValueFrom(
          this.planoService.getInfraestruturas('id,asc').pipe(
            catchError(() => of([]))
          )
        );
        this.infraestruturaData = infraestruturas.find(i => i.id === infrastructureId);
      } catch (error) {
        console.error('Erro ao carregar infraestrutura:', error);
      }
    }
  }

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  }

  formatarSetores(): string {
    const setores = this.formulario.get('setores')?.value;
    if (!setores || !Array.isArray(setores) || setores.length === 0) {
      return 'N/A';
    }
    return setores.map((s: any) => s.nome || s).join(', ');
  }

  getSetores(): any[] {
    const setores = this.formulario.get('setores')?.value;
    return Array.isArray(setores) ? setores : [];
  }

  getAssistentes(): any[] {
    const assistentes = this.formulario.get('assistentes')?.value;
    return Array.isArray(assistentes) ? assistentes.filter((a: any) => a.quantity > 0) : [];
  }

  getCanais(): any[] {
    const canais = this.formulario.get('canais')?.value;
    const assistantChannels = this.formulario.get('assistantChannels')?.value || [];
    const assistentes = this.getAssistentes();
    
    if (!Array.isArray(canais) || canais.length === 0) {
      return [];
    }

    // Retornar apenas canais que estão habilitados para pelo menos um assistente
    const canaisHabilitados = new Set<number>();
    assistentes.forEach((assistente: any) => {
      assistantChannels
        .filter((ac: any) => ac.assistantId === assistente.id && ac.enabled)
        .forEach((ac: any) => canaisHabilitados.add(ac.channelId));
    });

    return canais.filter((c: any) => canaisHabilitados.has(c.id));
  }

  getItensPorTipo(tipo: string) {
    if (!this.resultadoSimulacao) return [];
    return this.resultadoSimulacao.itens.filter(item => item.tipoItem === tipo);
  }

  getCustosVariaveis() {
    if (!this.resultadoSimulacao) return [];
    return this.resultadoSimulacao.custosVariaveis || [];
  }

  getTotalCustosVariaveis(): number {
    if (!this.resultadoSimulacao) return 0;
    return this.resultadoSimulacao.valorVariavelEstimadoTotal || 0;
  }

  formatarNomeCustoVariavel(custo: any): string {
    const provedor = custo.provedor || '';
    const recurso = custo.recurso || '';
    
    // Formatar nome do recurso de forma mais legível
    let nomeRecurso = recurso
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l: string) => l.toUpperCase());
    
    // Melhorar nomes específicos
    if (nomeRecurso.includes('Token Input Gpt4o Mini')) {
      nomeRecurso = 'Tokens GPT-4o Mini (Input)';
    } else if (nomeRecurso.includes('Whatsapp Conversa')) {
      nomeRecurso = 'Conversas WhatsApp';
    }
    
    return `${provedor} - ${nomeRecurso}`;
  }

  formatarDetalheCustoVariavel(custo: any): string {
    const consumo = custo.consumoEstimado || 0;
    const unidade = custo.unidadeEscala || '';
    
    // Formatar consumo com separadores de milhar
    const consumoFormatado = new Intl.NumberFormat('pt-BR').format(consumo);
    
    // Extrair e formatar unidade da escala
    let unidadeFormatada = '';
    if (unidade.includes('TOKEN')) {
      // Ex: "Por 1000 TOKEN_INPUT" -> calcular total de tokens
      const match = unidade.match(/Por\s+(\d+)\s+TOKEN/i);
      if (match) {
        const divisor = parseInt(match[1]);
        const totalTokens = consumo * divisor;
        const totalFormatado = new Intl.NumberFormat('pt-BR').format(totalTokens);
        unidadeFormatada = `Estimado: ${totalFormatado} tokens`;
      } else {
        unidadeFormatada = `Estimado: ${consumoFormatado} tokens`;
      }
    } else if (unidade.includes('MENSAGEM')) {
      // Ex: "Por MENSAGEM" -> "1.000 mensagens"
      unidadeFormatada = `Estimado: ${consumoFormatado} mensagens`;
    } else {
      unidadeFormatada = `Estimado: ${consumoFormatado} ${unidade.toLowerCase()}`;
    }
    
    return unidadeFormatada;
  }

  getNomeCliente(): string {
    return this.formulario.get('nome')?.value || 'N/A';
  }

  getEmailCliente(): string {
    return this.formulario.get('email')?.value || 'N/A';
  }

  getTelefoneCliente(): string {
    return this.formulario.get('telefone')?.value || 'N/A';
  }

  getEmpresaData(): any {
    return this.formulario.get('empresaData')?.value || null;
  }

  getNomeInfraestrutura(): string {
    return this.infraestruturaData?.nome || this.formulario.get('infrastructure')?.value || 'N/A';
  }

  getNomePeriodo(): string {
    return this.periodoData?.nome || this.formulario.get('selectedPeriod')?.value || 'N/A';
  }

  getDescricaoPeriodo(): string {
    if (!this.periodoData) return '';
    const meses = this.periodoData.meses;
    const desconto = this.periodoData.valorDesconto;
    const tipoDesconto = this.periodoData.tipoDesconto;
    
    let descricao = `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
    
    if (desconto > 0) {
      if (tipoDesconto === 'PERCENTUAL') {
        descricao += ` - ${this.formatarPercentual(desconto)}% de desconto`;
      } else {
        descricao += ` - ${this.formatarMoeda(desconto)} de desconto`;
      }
    }
    
    return descricao;
  }

  formatarPercentual(valor: number): string {
    // Formata o percentual sem decimais se for número inteiro
    if (valor % 1 === 0) {
      return valor.toFixed(0);
    }
    return valor.toFixed(2);
  }
}

