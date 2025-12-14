export interface Infraestrutura {
  id: number;
  nome: string;
  tipo: 'COMPARTILHADO_LITE' | 'DEDICADO_PADRAO' | 'DEDICADO_PERFORMANCE';
  custoTotalMensalAWS?: number;
  capacidadeClientes?: number;
  custoPorCliente?: number;
  markupSugerido?: number;
  precoVendaFinal?: number;
  limiteInstanciasOdoo?: number;
  limiteInstanciasN8n?: number;
  descricao?: string;
  ativo?: boolean;
}
