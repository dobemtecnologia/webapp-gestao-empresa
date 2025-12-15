export interface WizardState {
  currentStep: number; // 1 a 7
  selectedSectors: string[]; // ['Vendas', 'Suporte', etc]
  assistants: { id: number; nome: string; quantity: number; sector: string }[];
  channels: { id: number; nome: string; enabled: boolean }[];
  infrastructure: number | null; // ID da infraestrutura
  monthlyCredits: number; // Valor do slider (mensagens estimadas)
  tokensOpenAi: number; // Tokens OpenAI estimados
  selectedPeriod: 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL' | null; // Período selecionado
}

export interface PeriodOption {
  id: 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
  nome: string;
  descricao: string;
  desconto: number; // Percentual de desconto
  recomendado?: boolean;
}

export const SETORES_DISPONIVEIS = [
  'Vendas',
  'Suporte',
  'RH',
  'Financeiro',
  'Marketing'
];
