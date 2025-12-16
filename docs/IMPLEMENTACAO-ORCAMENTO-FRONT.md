# Tarefa: Implementação do Fluxo de Geração de Orçamento (Checkout do Wizard)

## 1. Contexto e Objetivo
O usuário finalizou a seleção de itens no Wizard (Passos: Setores -> Assistentes -> Canais -> Infraestrutura -> Volume -> Período -> Resumo).
Agora precisamos persistir essa escolha no Backend criando um registro na entidade `Orcamento`.

**Desafio Principal:** O sistema deve suportar dois cenários de usuários no momento do checkout:
1.  **Usuário Anônimo (Lead):** Não está logado. Precisamos capturar Nome/Email via Modal e salvar como Prospect.
2.  **Usuário Logado (Colaborador):** Já está autenticado e vinculado a uma `Empresa`. O orçamento deve ser salvo vinculado a essa empresa automaticamente.

## 2. Stack Tecnológico
- **Framework:** Angular (NgModule - não standalone, conforme projeto atual).
- **Gerenciamento de Estado:** Angular Signals (já implementado no `WizardStateService`).
- **UI:** Ionic (`ion-modal`, `ion-loading`, `ion-toast`).
- **Backend:** Spring Boot (JHipster).
- **Autenticação:** JWT Token via `AuthService` e `TokenStorageService`.

---

## 3. Especificação da Implementação

### A. Atualização do Modelo de Autenticação

**Problema:** O modelo `JWTToken` atual só possui `id_token`, mas a API retorna dados adicionais do usuário.

**Solução:** Atualizar `JWTToken` e `TokenStorageService` para armazenar dados do usuário.

**Arquivo:** `src/app/models/jwt-token.model.ts`
```typescript
export interface JWTToken {
  id_token: string;
  login?: string;
  firstName?: string;
  email?: string;
  imageUrl?: string;
  empresaId?: number;
  empresaNome?: string;
  papel?: string;
}
```

**Arquivo:** `src/app/services/token-storage.service.ts`
- Adicionar método `getEmpresaId(): number | null`
- Adicionar método `getEmpresaNome(): string | null`
- Garantir que `saveUser()` salve todos os campos do JWTToken

**Arquivo:** `src/app/services/auth.service.ts`
- Atualizar `login()` para salvar todos os campos do `JWTToken` via `tokenStorage.saveUser(response)`

### B. Modelos de Dados

**Arquivo:** `src/app/models/orcamento.model.ts` (criar)
```typescript
export interface OrcamentoDTO {
  id?: number;
  nomeProspect?: string;
  emailProspect?: string;
  telefoneProspect?: string;
  nomeCliente?: string;
  codigoHash?: string;
  visualizadoPeloCliente?: boolean;
  dataUltimaVisualizacao?: string;
  dataValidade?: string;
  status: 'RASCUNHO' | 'ENVIADO' | 'VISUALIZADO' | 'APROVADO' | 'REJEITADO' | 'EXPIRADO';
  valorTotalTabela: number;
  valorTotalMinimo: number;
  valorTotalFechado: number;
  percentualDescontoAplicado?: number;
  valorMargemCapturada?: number;
  valorComissaoEstimada?: number;
  observacoes?: string;
  criadoEm?: string;
  atualizadoEm?: string;
  empresa?: { id: number } | null;
  vendedor?: { id: number } | null;
  infraestrutura: { id: number };
  itens?: ItemOrcamentoDTO[];
}

export interface ItemOrcamentoDTO {
  id?: number;
  tipoItem: 'INFRAESTRUTURA' | 'ASSISTENTE' | 'CANAL' | 'PACOTE_CREDITOS';
  referenciaId: number;
  descricao?: string;
  quantidade: number;
  precoUnitarioTabela: number;
  precoUnitarioMinimo?: number;
  precoUnitarioFechado: number;
  totalMensalFechado?: number;
  totalSetupFechado?: number;
  orcamento?: OrcamentoDTO;
  catalogoProduto?: any;
}
```

### C. Serviço de Orçamento

**Arquivo:** `src/app/services/orcamento.service.ts` (criar)
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { OrcamentoDTO } from '../models/orcamento.model';

@Injectable({
  providedIn: 'root'
})
export class OrcamentoService {
  private apiUrl = `${environment.apiUrl}/api/orcamentos`;

  constructor(private http: HttpClient) { }

  create(orcamento: OrcamentoDTO): Observable<OrcamentoDTO> {
    return this.http.post<OrcamentoDTO>(this.apiUrl, orcamento);
  }

  getByHash(codigoHash: string): Observable<OrcamentoDTO> {
    return this.http.get<OrcamentoDTO>(`${this.apiUrl}/hash/${codigoHash}`);
  }
}
```

### D. Conversão WizardState → OrcamentoDTO

**Arquivo:** `src/app/wizard/wizard.page.ts`

Adicionar método `converterParaOrcamentoDTO()`:

```typescript
private converterParaOrcamentoDTO(
  leadData?: { nome: string; email: string; telefone?: string }
): OrcamentoDTO {
  const state = this.wizardState.getState();
  const simulacao = this.resultadoSimulacao;
  
  if (!simulacao || !state.infrastructure) {
    throw new Error('Simulação ou infraestrutura não encontrada');
  }

  // Calcula valores com desconto do período
  const baseMensal = simulacao.valorMensalTotal;
  const periodo = state.selectedPeriod;
  let valorTotalFechado = baseMensal;
  let percentualDesconto = 0;

  if (periodo) {
    // Busca dados do período para calcular desconto
    // (já temos isso calculado no componente de período)
    // Aqui precisamos recalcular ou usar o valor já calculado
    // Por enquanto, assumimos que o desconto será aplicado no backend
    valorTotalFechado = baseMensal; // Será ajustado após buscar período
  }

  // Mapeia itens da simulação para ItemOrcamentoDTO
  const itens: ItemOrcamentoDTO[] = simulacao.itens.map(item => ({
    tipoItem: item.tipoItem as 'INFRAESTRUTURA' | 'ASSISTENTE' | 'CANAL' | 'PACOTE_CREDITOS',
    referenciaId: item.referenciaId,
    descricao: item.nomeComponente,
    quantidade: item.quantidade,
    precoUnitarioTabela: item.valorUnitarioMensal,
    precoUnitarioFechado: item.valorUnitarioMensal, // Inicialmente igual à tabela
    totalMensalFechado: item.subtotalMensal,
    totalSetupFechado: item.subtotalSetup
  }));

  const orcamento: OrcamentoDTO = {
    status: 'RASCUNHO',
    valorTotalTabela: simulacao.valorMensalTotal,
    valorTotalMinimo: 0, // Backend calcula
    valorTotalFechado: valorTotalFechado,
    infraestrutura: { id: state.infrastructure },
    vendedor: { id: 1 }, // TODO: Buscar vendedor padrão ou do usuário logado
    itens: itens
  };

  // Se usuário logado, vincula à empresa
  if (this.authService.isAuthenticated()) {
    const empresaId = this.tokenStorage.getEmpresaId();
    if (empresaId) {
      orcamento.empresa = { id: empresaId };
    }
  }

  // Se lead (usuário anônimo), adiciona dados do prospect
  if (leadData) {
    orcamento.nomeProspect = leadData.nome;
    orcamento.emailProspect = leadData.email;
    if (leadData.telefone) {
      orcamento.telefoneProspect = leadData.telefone;
    }
  }

  return orcamento;
}
```

**Nota:** O cálculo do desconto do período deve considerar:
- Buscar o `PeriodoContratacao` selecionado via API
- Aplicar o `valorDesconto` (percentual) no `valorTotalFechado`
- Calcular `percentualDescontoAplicado`

### E. Componente de Captura de Lead

**Arquivo:** `src/app/wizard/components/lead-capture-modal.component.ts` (criar)
- **Tipo:** Componente NgModule (não standalone)
- **Campos:** Nome (Obrigatório), Email Corporativo (Obrigatório), WhatsApp (Opcional)
- **UI:** Clean, Flat Design, respeitando tema claro/escuro do Ionic
- **Validação:** Reactive Forms com validators
- **Ação:** Botão "Ver Proposta". Ao clicar, retorna os dados via `modalController.dismiss(data)`

**Estrutura:**
```typescript
export interface LeadData {
  nome: string;
  email: string;
  telefone?: string;
}
```

### F. Lógica do Botão "Finalizar" no Wizard

**Arquivo:** `src/app/wizard/wizard.page.ts`

Adicionar método `finalizarOrcamento()`:

```typescript
async finalizarOrcamento() {
  // Validações
  if (!this.resultadoSimulacao) {
    this.showToast('É necessário simular o plano primeiro.', 'warning');
    return;
  }

  if (!this.selectedPeriod()) {
    this.showToast('É necessário selecionar um período de contratação.', 'warning');
    return;
  }

  // Verifica autenticação
  const isAuthenticated = this.authService.isAuthenticated();
  let leadData: { nome: string; email: string; telefone?: string } | undefined;

  // Se não autenticado, abre modal de captura de lead
  if (!isAuthenticated) {
    const modal = await this.modalController.create({
      component: LeadCaptureModalComponent
    });
    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (!data || !data.nome || !data.email) {
      return; // Usuário cancelou ou não preencheu
    }
    leadData = data;
  }

  // Monta DTO
  const orcamentoDTO = this.converterParaOrcamentoDTO(leadData);

  // Loading
  const loading = await this.loadingController.create({
    message: 'Gerando proposta...',
    spinner: 'crescent'
  });
  await loading.present();

  // Chama API
  this.orcamentoService.create(orcamentoDTO).subscribe({
    next: (orcamentoSalvo) => {
      loading.dismiss();
      // Redireciona para página de resultado
      this.router.navigate(['/resultado-orcamento'], {
        queryParams: { hash: orcamentoSalvo.codigoHash }
      });
    },
    error: (error) => {
      loading.dismiss();
      let errorMessage = 'Erro ao gerar proposta. Tente novamente.';
      if (error.error?.message) {
        errorMessage = error.error.message;
      }
      this.showToast(errorMessage, 'danger');
    }
  });
}
```

**Importações necessárias:**
- `ModalController` do `@ionic/angular`
- `OrcamentoService`
- `LeadCaptureModalComponent`

### G. Página de Resultado do Orçamento

**Arquivo:** `src/app/resultado-orcamento/resultado-orcamento.page.ts` (criar)

- **Rota:** `/resultado-orcamento?hash={codigoHash}`
- **Funcionalidades:**
  - Busca orçamento via `codigoHash` (query param)
  - Exibe resumo dos valores (tabela, fechado, desconto)
  - Exibe link compartilhável: `https://evah.io/proposta/{codigoHash}` (ou domínio configurável)
  - Botão "Contratar Agora" (futuro: fluxo de pagamento)
  - Botão "Falar com Vendedor" (abre WhatsApp com mensagem pré-formatada)
  - Botão "Copiar Link" (copia link para clipboard)

**Estrutura da página:**
- Card com resumo de valores
- Card com link compartilhável (com botão de copiar)
- Botões de ação (Contratar, Falar com Vendedor)

### H. Integração no Wizard

**Arquivo:** `src/app/wizard/wizard.page.html`

No passo 7 (Resumo), adicionar botão "Finalizar e Gerar Proposta":

```html
@if (currentStep() === 7) {
  <div class="wizard-step">
    <h2>Resumo do Plano</h2>
    <app-wizard-step-review></app-wizard-step-review>
    
    <div class="finalizar-actions">
      <ion-button 
        expand="block" 
        color="success" 
        size="large"
        (click)="finalizarOrcamento()"
        [disabled]="isLoading || !resultadoSimulacao || !selectedPeriod()">
        <ion-icon slot="start" name="checkmark-circle-outline"></ion-icon>
        Finalizar e Gerar Proposta
      </ion-button>
    </div>
  </div>
}
```

---

## 4. Checklist de Implementação

### Fase 1: Preparação (Modelos e Serviços)
- [ ] Atualizar `JWTToken` model com campos adicionais
- [ ] Atualizar `TokenStorageService` para salvar/ler dados do usuário
- [ ] Atualizar `AuthService.login()` para salvar dados completos
- [ ] Criar `OrcamentoDTO` e `ItemOrcamentoDTO` models
- [ ] Criar `OrcamentoService` com método `create()`

### Fase 2: Conversão de Dados
- [ ] Implementar `converterParaOrcamentoDTO()` no `WizardPage`
- [ ] Integrar cálculo de desconto do período selecionado
- [ ] Mapear `PlanoSimulacaoResponse.itens` → `ItemOrcamentoDTO[]`
- [ ] Calcular `valorTotalTabela` e `valorTotalFechado` corretamente

### Fase 3: Captura de Lead
- [ ] Criar `LeadCaptureModalComponent` (NgModule)
- [ ] Implementar Reactive Forms com validação
- [ ] Estilizar modal (tema claro/escuro)
- [ ] Testar retorno de dados via `modalController.dismiss()`

### Fase 4: Fluxo de Finalização
- [ ] Implementar `finalizarOrcamento()` no `WizardPage`
- [ ] Adicionar validações (simulação, período)
- [ ] Integrar modal de lead para usuários anônimos
- [ ] Integrar criação de orçamento via `OrcamentoService`
- [ ] Adicionar tratamento de erros

### Fase 5: Página de Resultado
- [ ] Criar módulo `ResultadoOrcamentoPageModule`
- [ ] Criar rota `/resultado-orcamento`
- [ ] Implementar busca de orçamento por `codigoHash`
- [ ] Exibir resumo de valores
- [ ] Exibir link compartilhável com botão de copiar
- [ ] Adicionar botões de ação (Contratar, WhatsApp)

### Fase 6: Testes e Ajustes
- [ ] Testar fluxo completo com usuário logado
- [ ] Testar fluxo completo com usuário anônimo (lead)
- [ ] Validar cálculo de descontos por período
- [ ] Validar mapeamento de itens
- [ ] Testar tratamento de erros

---

## 5. Observações Importantes

1. **Período de Contratação:** O desconto do período deve ser aplicado no `valorTotalFechado`. O cálculo já está sendo feito no componente `wizard-step-period`, mas precisa ser refletido no `OrcamentoDTO`.

2. **Vendedor:** O campo `vendedor` é obrigatório no `OrcamentoDTO`. Opções:
   - Se usuário logado: usar vendedor vinculado ao usuário (se disponível no contexto)
   - Se usuário anônimo: usar vendedor padrão do sistema (ID fixo ou buscar via API)
   - **Nota:** Verificar com backend se há um vendedor padrão ou se precisa ser passado sempre

3. **Infraestrutura:** O campo `infraestrutura` é obrigatório e deve ser um objeto `{ id: number }`, não apenas o ID.

4. **Itens:** Os itens podem ser enviados junto com o orçamento ou criados separadamente via `/api/item-orcamentos`. Verificar com o backend qual abordagem é esperada.

5. **Link Compartilhável:** O domínio do link (`https://evah.io/proposta/...`) deve ser configurável via `environment.ts`.

6. **Rota do Wizard:** O wizard atual **não tem** `AuthGuard`, permitindo acesso anônimo. Isso está correto para suportar leads.

---

## 6. Endpoints da API

- **POST** `/api/orcamentos` - Criar orçamento
- **GET** `/api/orcamentos/{id}` - Buscar orçamento por ID
- **GET** `/api/orcamentos/hash/{codigoHash}` - Buscar orçamento por hash (se disponível)
- **POST** `/api/item-orcamentos` - Criar item de orçamento (se necessário criar separadamente)

---

## 7. Estrutura de Resposta Esperada

Ao criar um orçamento, a API deve retornar:

```json
{
  "id": 123,
  "codigoHash": "abc123def456",
  "status": "RASCUNHO",
  "valorTotalTabela": 1500.00,
  "valorTotalFechado": 1500.00,
  "valorTotalMinimo": 1200.00,
  "infraestrutura": { "id": 1001 },
  "empresa": { "id": 1551 },
  "itens": [...]
}
```

O campo `codigoHash` é essencial para gerar o link compartilhável.
