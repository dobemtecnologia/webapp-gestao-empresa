import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { OrcamentoDTO, ItemOrcamentoDTO } from '../models/orcamento.model';

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

  update(id: number, orcamento: OrcamentoDTO): Observable<OrcamentoDTO> {
    // Tenta atualizar usando o endpoint customizado com ID (PUT)
    // Assumindo que o backend suporta PUT no endpoint customizado com ID
    return this.http.put<OrcamentoDTO>(`${this.apiUrlCustom}/${id}`, orcamento);
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

  // Novo método para buscar orçamento com itens pelo hash
  getByHashComItens(codigoHash: string): Observable<{ orcamento: OrcamentoDTO; itens: ItemOrcamentoDTO[] }> {
    // Tenta primeiro pelo endpoint customizado com hash
    // Se não funcionar, pode tentar buscar pelo ID após obter o orçamento básico
    return this.http.get<{ orcamento: OrcamentoDTO; itens: ItemOrcamentoDTO[] }>(
      `${environment.apiUrl}/api/custom/orcamentos/hash/${codigoHash}/com-itens`
    );
  }

  // Novo método para buscar orçamento com itens pelo ID
  getByIdComItens(id: number): Observable<{ orcamento: OrcamentoDTO; itens: ItemOrcamentoDTO[] }> {
    return this.http.get<{ orcamento: OrcamentoDTO; itens: ItemOrcamentoDTO[] }>(
      `${environment.apiUrl}/api/custom/orcamentos/${id}/com-itens`
    );
  }

  getAll(sort: string = 'id,desc'): Observable<OrcamentoDTO[]> {
    const params = new HttpParams().set('sort', sort);
    return this.http.get<OrcamentoDTO[]>(this.apiUrl, { params });
  }
}



