export interface CNAE {
  codigo: number;
  descricao: string;
}

export interface Endereco {
  logradouro: string;
  descricaoTipoDeLogradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  municipio: string;
  uf: string;
  cep: string;
}

export interface Contato {
  telefone: string | null;
  dddTelefone1: string;
  dddTelefone2: string;
  dddFax: string;
  email: string | null;
}

export interface SetorSugerido {
  id: number;
  nome: string;
  confianca: number;
}

export interface CNPJResponse {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  situacaoCadastral: string;
  situacaoCadastralCodigo: number;
  descricaoSituacaoCadastral: string;
  dataAbertura: string;
  dataSituacaoCadastral: string;
  motivoSituacaoCadastral: string;
  descricaoMotivoSituacaoCadastral: string;
  cnaePrincipal: CNAE;
  cnaesSecundarios: CNAE[];
  cnaeFiscal: number;
  cnaeFiscalDescricao: string;
  endereco: Endereco;
  contato: Contato;
  capitalSocial: number;
  porte: string;
  codigoPorte: number;
  opcaoPeloSimples: boolean;
  dataOpcaoPeloSimples: string;
  dataExclusaoDoSimples: string;
  opcaoPeloMei: boolean;
  regimeTributario: string[];
  naturezaJuridica: string;
  codigoNaturezaJuridica: number;
  situacaoEspecial: string;
  enteFederativoResponsavel: string;
  identificadorMatrizFilial: number;
  descricaoIdentificadorMatrizFilial: string;
  qualificacaoDoResponsavel: number;
  nomeCidadeNoExterior: string;
  codigoMunicipio: number;
  codigoMunicipioIbge: number;
  qsa: any[];
  setorSugerido: SetorSugerido;
}
