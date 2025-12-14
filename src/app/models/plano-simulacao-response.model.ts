import { ItemSimulacao } from './item-simulacao.model';
import { CustoVariavel } from './custo-variavel.model';

export interface PlanoSimulacaoResponse {
  nomePlano: string;
  valorMensalTotal: number;
  valorSetupTotal: number;
  valorVariavelEstimadoTotal: number;
  itens: ItemSimulacao[];
  custosVariaveis: CustoVariavel[];
}
