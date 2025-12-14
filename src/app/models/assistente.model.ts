export interface Assistente {
  id: number;
  nome: string;
  descricao?: string;
  promptBase?: string;
  modeloIA?: string;
  status?: string;
  ativo?: boolean;
  catalogoProduto?: any;
}
