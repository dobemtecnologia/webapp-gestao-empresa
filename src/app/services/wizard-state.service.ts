import { Injectable, signal, computed } from '@angular/core';
import { WizardState, SETORES_DISPONIVEIS } from '../models/wizard-state.model';

@Injectable({
  providedIn: 'root'
})
export class WizardStateService {
  // Estado do wizard usando Signals
  private state = signal<WizardState>({
    currentStep: 1,
    selectedSectors: [],
    assistants: [],
    channels: [],
    assistantChannels: [],
    infrastructure: null,
    monthlyCredits: 1000,
    tokensOpenAi: 1000000,
    selectedPeriod: null,
    baseMonthlyValue: null
  });

  // Getters computados
  readonly currentStep = computed(() => this.state().currentStep);
  readonly selectedSectors = computed(() => this.state().selectedSectors);
  readonly assistants = computed(() => this.state().assistants);
  readonly channels = computed(() => this.state().channels);
   // Mapeamento Assistente x Canal
  readonly assistantChannels = computed(() => this.state().assistantChannels);
  readonly infrastructure = computed(() => this.state().infrastructure);
  readonly monthlyCredits = computed(() => this.state().monthlyCredits);
  readonly tokensOpenAi = computed(() => this.state().tokensOpenAi);
  readonly selectedPeriod = computed(() => this.state().selectedPeriod);
  readonly baseMonthlyValue = computed(() => this.state().baseMonthlyValue ?? null);

  // Ações para atualizar o estado
  setCurrentStep(step: number) {
    this.state.update(s => ({ ...s, currentStep: step }));
  }

  nextStep() {
    this.state.update(s => ({ ...s, currentStep: Math.min(7, s.currentStep + 1) }));
  }

  previousStep() {
    this.state.update(s => ({ ...s, currentStep: Math.max(1, s.currentStep - 1) }));
  }

  toggleSector(sector: string) {
    this.state.update(s => {
      const sectors = s.selectedSectors.includes(sector)
        ? s.selectedSectors.filter(sec => sec !== sector)
        : [...s.selectedSectors, sector];
      return { ...s, selectedSectors: sectors };
    });
  }

  setAssistants(assistants: { id: number; nome: string; quantity: number; sector: string }[]) {
    this.state.update(s => ({ ...s, assistants }));
  }

  updateAssistantQuantity(assistantId: number, quantity: number, sector: string) {
    this.state.update(s => ({
      ...s,
      assistants: s.assistants.map(a =>
        a.id === assistantId && a.sector === sector ? { ...a, quantity } : a
      )
    }));
  }

  setChannels(channels: { id: number; nome: string; enabled: boolean }[]) {
    this.state.update(s => ({ ...s, channels }));
  }

  setAssistantChannels(assistantChannels: { assistantId: number; channelId: number; enabled: boolean }[]) {
    this.state.update(s => ({ ...s, assistantChannels }));
  }

  toggleAssistantChannel(assistantId: number, channelId: number) {
    this.state.update(s => {
      const existing = s.assistantChannels.find(
        ac => ac.assistantId === assistantId && ac.channelId === channelId
      );
      if (existing) {
        return {
          ...s,
          assistantChannels: s.assistantChannels.map(ac =>
            ac.assistantId === assistantId && ac.channelId === channelId
              ? { ...ac, enabled: !ac.enabled }
              : ac
          )
        };
      }
      return {
        ...s,
        assistantChannels: [
          ...s.assistantChannels,
          { assistantId, channelId, enabled: true }
        ]
      };
    });
  }

  toggleChannel(channelId: number) {
    this.state.update(s => ({
      ...s,
      channels: s.channels.map(c =>
        c.id === channelId ? { ...c, enabled: !c.enabled } : c
      )
    }));
  }

  setInfrastructure(infrastructureId: number | null) {
    this.state.update(s => ({ ...s, infrastructure: infrastructureId }));
  }

  setMonthlyCredits(credits: number) {
    this.state.update(s => ({ ...s, monthlyCredits: credits }));
  }

  setTokensOpenAi(tokens: number) {
    this.state.update(s => ({ ...s, tokensOpenAi: tokens }));
  }

  setSelectedPeriod(period: 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL' | null) {
    this.state.update(s => ({ ...s, selectedPeriod: period }));
  }

  setBaseMonthlyValue(baseValue: number | null) {
    this.state.update(s => ({ ...s, baseMonthlyValue: baseValue }));
  }

  reset() {
    this.state.set({
      currentStep: 1,
      selectedSectors: [],
      assistants: [],
      channels: [],
      assistantChannels: [],
      infrastructure: null,
      monthlyCredits: 1000,
      tokensOpenAi: 1000000,
      selectedPeriod: null,
      baseMonthlyValue: null
    });
  }

  getState(): WizardState {
    return this.state();
  }
}
