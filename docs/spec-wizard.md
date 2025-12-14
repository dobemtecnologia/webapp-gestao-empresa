# Contexto da Tarefa: Criação do "Evah Plan Wizard"

## 1. Objetivo
Criar um componente de "Wizard" (Passo a Passo) para simulação de preços em self-service.
Esta interface será uma alternativa simplificada e guiada à tela atual de "Simulação Avançada".
O objetivo é guiar o usuário na montagem do plano ideal, com a personagem "Evah" (IA) explicando cada etapa.

## 2. Stack Tecnológico
- **Framework:** Angular (versão atual, Standalone Components).
- **UI Kit:** Ionic 8.
- **Gerenciamento de Estado:** Angular Signals (obrigatório para reatividade fluida).
- **Estilo:** SCSS modular, Flat Design, Minimalista, Dark Mode (seguindo o padrão da imagem `image_5e6067.png`).

## 3. Estrutura de Dados (Estado Global do Wizard)
Precisamos de um `Signal` ou `Service` que armazene o estado acumulado:
```typescript
interface WizardState {
  currentStep: number; // 1 a 6
  selectedSectors: string[]; // ['Vendas', 'Suporte', etc]
  assistants: { type: string; quantity: number; sector: string }[];
  channels: { id: string; name: string; enabled: boolean }[];
  infrastructure: 'shared' | 'dedicated';
  monthlyCredits: number; // Valor do slider
}
4. Requisitos de UI/UX (O Fluxo)
A interface deve ser dividida em duas colunas (em Desktop) ou empilhada (em Mobile):

Esquerda (Guia): Avatar da Evah + Balão de fala contextual (muda a cada passo).

Direita (Ação): O formulário interativo do passo atual.

Sticky Footer/Sidebar: Um resumo do valor mensal atualizado em tempo real.

Detalhamento dos Passos (Steps)
Passo 1: Setores (Sectors)
Texto da Evah: "Olá! Sou a Evah. Para começar, em quais áreas sua empresa precisa de reforço hoje?"

Componente: Grid de Cards selecionáveis (Multi-select).

Opções: Vendas, Suporte, RH, Financeiro, Marketing.

Interação: Ao clicar, o card fica "ativo" (borda colorida/highlight).

Passo 2: Assistentes (Assistants)
Texto da Evah: "Ótimo. Baseado nos setores, estes são os especialistas disponíveis. Quantos de cada você precisa?"

Lógica: Filtrar lista de assistentes baseado nos setores do Passo 1.

Componente: Lista com ion-item.

Ação: Botões de incremento/decremento [-] 0 [+] ao lado de cada assistente.

Passo 3: Canais (Channels)
Texto da Evah: "Por onde esses assistentes vão falar com seu cliente?"

Componente: Lista de Cards com Ícones (WhatsApp, Instagram, Web, API).

Ação: Toggle Switch ou Checkbox estilo "Button".

Passo 4: Infraestrutura (Infrastructure)
Texto da Evah: "Qual tipo de infraestrutura você prefere?"

Componente: 2 Cards grandes comparativos (Radio Group visual).

Shared: "Econômico, recursos compartilhados."

Dedicated: "Performance máxima e IP isolado."

Passo 5: Volume (Credits)
Texto da Evah: "Qual sua estimativa de conversas por mês?"

Componente: ion-range (Slider) com "Snaps" (pontos de parada).

Faixas: 1k, 5k, 10k, 50k, 100k+.

Feedback: Mostrar "Equivalente a X horas humanas" abaixo do slider.

Passo 6: Resumo (Review)
Texto da Evah: "Pronto! Aqui está o desenho da sua operação."

Componente: Lista resumida dos itens selecionados.

Ação: Botão Principal "Contratar" e Botão Secundário "Personalizar (Modo Avançado)" -> Este botão deve redirecionar para a tela existente da imagem image_5e6067.png carregando os dados preenchidos.

5. Diretrizes de Código para a IA
Componentização: Crie um componente pai PlanWizardComponent e sub-componentes para cada passo (ex: WizardStepSectorsComponent, WizardStepAssistantsComponent) para manter o código limpo.

Animações: Use @angular/animations para transição suave (fade-in/slide) entre os passos.

Ionic Components: Use ion-grid, ion-col, ion-card, ion-range, ion-toggle.

Estilização: Evite o visual padrão "nativo" do Ionic. Customize via CSS Variables para ficar com visual "SaaS Flat Dark".

Use bordas arredondadas (radius 12px ou 16px).

Use cores de destaque (Accent Color) para itens selecionados.

6. Exemplo de JSON de Saída
Ao final, o wizard deve gerar um objeto compatível com o backend:

JSON

{
  "planName": "Plano Personalizado Evah",
  "items": [
    { "type": "ASSISTANT", "subtype": "SDR_HUNTER", "quantity": 2 },
    { "type": "CHANNEL", "subtype": "WHATSAPP", "quantity": 1 }
  ],
  "infrastructure": "DEDICATED",
  "estimatedTokens": 50000
}

---

### Dicas Extras para Angular + Ionic 8

Como CEO e dev, aqui vão 3 pontos de atenção para você revisar quando o Cursor gerar o código:

1.  **Control Flow (`@if`, `@for`):** Garanta que a IA use a nova sintaxe do Angular 17+ (o bloco `@if` e `@switch`) para controlar qual passo está visível. É muito mais performático que o antigo `*ngIf`.
2.  **Signals vs Zone.js:** O Ionic 8 funciona super bem com Signals. Peça para o Cursor usar `input()` e `output()` baseados em signals nos sub-componentes. Isso vai deixar a atualização de preço instantânea sem "engasgos" na UI.
3.  **Responsividade:** O layout "Lado a Lado" (Evah na esquerda, Form na direita) é lindo no Desktop, mas no Mobile a Evah deve virar apenas um "Header" pequeno ou um ícone flutuante para não ocupar espaço de tela útil.

**Próximo passo:** Quer que eu gere o **CSS (SCSS)** base para garantir esse visual "Flat/Minimalista" que você gosta, para você já entregar o estilo pronto junto com o prompt?