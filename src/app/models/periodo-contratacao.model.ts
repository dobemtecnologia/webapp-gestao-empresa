export interface PeriodoContratacao {
  id: number;
  nome: string;
  codigo: 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL' | string;
  meses: number;
  tipoDesconto: 'PERCENTUAL' | 'VALOR_FIXO' | string;
  valorDesconto: number;
  ativo: boolean;
}

