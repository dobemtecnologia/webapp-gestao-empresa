import { Injectable } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { WizardState } from '../models/wizard-state.model';
import { ChatMessage } from './wizard-state.service';

export interface UserChoices {
  name?: string;
  email?: string;
  phone?: string;
  company?: {
    cnpj: string;
    razaoSocial: string;
    nomeFantasia?: string;
  };
  assistants?: { id: number; nome: string; quantity: number }[];
  selectedSectors?: string[];
  infrastructure?: number | null;
  selectedPeriod?: string | null;
  orcamentoHash?: string | null;
}

export interface WizardSessionData {
  sessionId: string;
  lastUpdated: Date;
  currentState: WizardState;
  chatHistory: ChatMessage[];
  userChoices?: UserChoices; // Dados estruturados separados
  userName?: string; // Mantido para compatibilidade
  email?: string;
  phone?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WizardFirebaseService {
  private app: FirebaseApp;
  private firestore: Firestore;
  private readonly COLLECTION_NAME = 'wizard_sessions';

  constructor() {
    // Inicialização direta do Firebase usando a configuração do environment
    // Usamos 'as any' para evitar erros de tipagem estrita no environment
    this.app = initializeApp((environment as any).firebase);
    this.firestore = getFirestore(this.app);
    console.log('Firebase Service inicializado');
  }

  // Gera um ID de sessão único se não existir
  getOrCreateSessionId(): string {
    let sessionId = localStorage.getItem('wizard_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('wizard_session_id', sessionId);
      console.log('Novo Session ID criado:', sessionId);
    } else {
      console.log('Session ID existente recuperado:', sessionId);
    }
    return sessionId;
  }

  // Salva o estado completo no Firestore
  async saveSessionState(
    state: WizardState, 
    chatHistory: ChatMessage[], 
    userChoices?: UserChoices
  ) {
    const sessionId = this.getOrCreateSessionId();
    const docRef = doc(this.firestore, this.COLLECTION_NAME, sessionId);

    // Removemos funções ou referências circulares antes de salvar
    const dataToSave: WizardSessionData = {
      sessionId,
      lastUpdated: new Date(),
      currentState: JSON.parse(JSON.stringify(state)),
      chatHistory: JSON.parse(JSON.stringify(chatHistory)),
      userChoices: userChoices ? JSON.parse(JSON.stringify(userChoices)) : undefined
    };

    try {
      // console.log('Salva sessão no Firebase...', sessionId);
      await setDoc(docRef, dataToSave, { merge: true });
      // console.log('Sessão salva com sucesso!');
    } catch (error) {
      console.error('Erro CRÍTICO ao salvar sessão no Firebase:', error);
    }
  }

  // Recupera o estado
  async loadSessionState(): Promise<WizardSessionData | null> {
    const sessionId = localStorage.getItem('wizard_session_id');
    if (!sessionId) {
      console.log('Nenhuma sessão local encontrada para restaurar.');
      return null;
    }

    const docRef = doc(this.firestore, this.COLLECTION_NAME, sessionId);
    
    try {
      console.log('Tentando restaurar sessão do Firebase...', sessionId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        console.log('Sessão restaurada com sucesso!', data);
        return data as WizardSessionData;
      } else {
        console.log('Documento não encontrado no Firebase para esta sessão.');
      }
    } catch (error) {
      console.error('Erro CRÍTICO ao carregar sessão do Firebase:', error);
    }
    
    return null;
  }

  // Limpa a sessão local (para começar do zero)
  clearLocalSession() {
    localStorage.removeItem('wizard_session_id');
    console.log('Sessão local limpa.');
  }
}
