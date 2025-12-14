export interface WizardState {
  currentStep: number; // 1 a 6
  selectedSectors: string[]; // ['Vendas', 'Suporte', etc]
  assistants: { id: number; nome: string; quantity: number; sector: string }[];
  channels: { id: number; nome: string; enabled: boolean }[];
  infrastructure: number | null; // ID da infraestrutura
  monthlyCredits: number; // Valor do slider (mensagens estimadas)
  tokensOpenAi: number; // Tokens OpenAI estimados
}

export const SETORES_DISPONIVEIS = [
  'Vendas',
  'Suporte',
  'RH',
  'Financeiro',
  'Marketing'
];
