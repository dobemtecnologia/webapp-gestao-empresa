export interface ItemSimulacao {
  tipoItem: 'INFRAESTRUTURA' | 'ASSISTENTE' | 'CANAL' | 'PACOTE_CREDITOS';
  referenciaId: number;
  nomeComponente: string;
  quantidade: number;
  valorUnitarioMensal: number;
  valorUnitarioSetup: number;
  subtotalMensal: number;
  subtotalSetup: number;
}
