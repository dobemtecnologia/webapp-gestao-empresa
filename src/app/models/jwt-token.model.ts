export interface JWTToken {
  id_token: string;
  login?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  imageUrl?: string;
  empresaId?: number;
  empresaNome?: string;
  papel?: string;
}
