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
    infrastructure: null,
    monthlyCredits: 1000,
    tokensOpenAi: 50000
  });

  // Getters computados
  readonly currentStep = computed(() => this.state().currentStep);
  readonly selectedSectors = computed(() => this.state().selectedSectors);
  readonly assistants = computed(() => this.state().assistants);
  readonly channels = computed(() => this.state().channels);
  readonly infrastructure = computed(() => this.state().infrastructure);
  readonly monthlyCredits = computed(() => this.state().monthlyCredits);
  readonly tokensOpenAi = computed(() => this.state().tokensOpenAi);

  // Ações para atualizar o estado
  setCurrentStep(step: number) {
    this.state.update(s => ({ ...s, currentStep: step }));
  }

  nextStep() {
    this.state.update(s => ({ ...s, currentStep: Math.min(6, s.currentStep + 1) }));
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

  reset() {
    this.state.set({
      currentStep: 1,
      selectedSectors: [],
      assistants: [],
      channels: [],
      infrastructure: null,
      monthlyCredits: 1000,
      tokensOpenAi: 50000
    });
  }

  getState(): WizardState {
    return this.state();
  }
}
