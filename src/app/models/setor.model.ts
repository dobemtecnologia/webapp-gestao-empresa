import { Assistente } from './assistente.model';

export interface AgenteDTO {
  id: number;
  nome: string;
  descricao?: string;
  icone?: string;
  ativo?: boolean;
}

export interface SetorDTO {
  id: number;
  nome: string;
  descricao?: string;
  icone?: string;
  ativo: boolean;
  assistentes?: Assistente[];
  agentes?: AgenteDTO[];
}
