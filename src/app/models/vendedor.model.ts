export interface VendedorDTO {
  id: number;
  nome: string;
  email?: string;
  tipo?: 'INTERNO' | 'PARCEIRO' | 'SISTEMA_IA';
  ativo?: boolean;
}
