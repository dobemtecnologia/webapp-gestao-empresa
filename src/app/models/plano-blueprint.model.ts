import { ItemBlueprint } from './item-blueprint.model';
import { ConsumoEstimado } from './consumo-estimado.model';

export interface PlanoBlueprint {
  nomePlano: string;
  itens: ItemBlueprint[];
  consumoEstimado: ConsumoEstimado;
}
