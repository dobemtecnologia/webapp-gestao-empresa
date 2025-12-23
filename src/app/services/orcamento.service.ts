import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { OrcamentoDTO } from '../models/orcamento.model';

@Injectable({
  providedIn: 'root'
})
export class OrcamentoService {
  private apiUrl = `${environment.apiUrl}/api/orcamentos`;
  private apiUrlCustom = `${environment.apiUrl}/api/custom/orcamentos/com-itens`;

  constructor(private http: HttpClient) { }

  create(orcamento: OrcamentoDTO): Observable<OrcamentoDTO> {
    // Usa o novo endpoint customizado
    return this.http.post<OrcamentoDTO>(this.apiUrlCustom, orcamento);
  }

  getById(id: number): Observable<OrcamentoDTO> {
    return this.http.get<OrcamentoDTO>(`${this.apiUrl}/${id}`);
  }

  getByHash(codigoHash: string): Observable<OrcamentoDTO> {
    // Tenta buscar por hash diretamente
    // Se o endpoint não existir, pode ser necessário buscar todos e filtrar
    // ou usar outro endpoint específico
    return this.http.get<OrcamentoDTO>(`${this.apiUrl}/hash/${codigoHash}`);
  }

  getAll(sort: string = 'id,desc'): Observable<OrcamentoDTO[]> {
    const params = new HttpParams().set('sort', sort);
    return this.http.get<OrcamentoDTO[]>(this.apiUrl, { params });
  }
}



