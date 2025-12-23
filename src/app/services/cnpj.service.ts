import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CNPJResponse } from '../models/cnpj-response.model';

@Injectable({
  providedIn: 'root'
})
export class CnpjService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/custom/cnpj`;

  /**
   * Consulta dados de uma empresa pelo CNPJ
   * @param cnpj CNPJ sem formatação (apenas números) ou com formatação
   * @returns Observable com os dados da empresa incluindo setor sugerido
   */
  consultarCNPJ(cnpj: string): Observable<CNPJResponse> {
    // Remove formatação do CNPJ (apenas números)
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    
    return this.http.get<CNPJResponse>(`${this.apiUrl}/${cnpjLimpo}`);
  }
}
