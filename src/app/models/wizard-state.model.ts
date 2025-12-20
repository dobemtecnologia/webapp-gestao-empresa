import { SetorDTO } from './setor.model';

export interface WizardState {
  currentStep: number; // 1 a 7
  selectedSectors: SetorDTO[]; // Setores completos selecionados
  assistants: { id: number; nome: string; quantity: number; sector: string }[];
  channels: { id: number; nome: string; enabled: boolean }[];
  assistantChannels: { assistantId: number; channelId: number; enabled: boolean }[];
  infrastructure: number | null; // ID da infraestrutura
  monthlyCredits: number; // Valor do slider (mensagens estimadas)
  tokensOpenAi: number; // Tokens OpenAI estimados
  selectedPeriod: 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL' | null; // Período selecionado
  baseMonthlyValue?: number | null; // Valor mensal base retornado pela simulação
}

export interface PeriodOption {
  id: 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
  nome: string;
  descricao: string;
  desconto: number; // Percentual de desconto
  recomendado?: boolean;
}

// SETORES_DISPONIVEIS removido - agora carregado dinamicamente da API
