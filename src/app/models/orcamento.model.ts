export interface EmpresaDadosCnpj {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  situacaoCadastral?: string;
  emailFinanceiro?: string;
}

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
  empresaDadosCnpj?: EmpresaDadosCnpj;
  vendedor: { id: number };
  infraestrutura: { id: number };
  periodoId?: number;
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

export interface LeadData {
  nome: string;
  email: string;
  telefone?: string;
}



