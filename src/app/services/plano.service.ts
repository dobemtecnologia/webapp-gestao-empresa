import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PlanoBlueprint } from '../models/plano-blueprint.model';
import { PlanoSimulacaoResponse } from '../models/plano-simulacao-response.model';
import { Infraestrutura } from '../models/infraestrutura.model';
import { Assistente } from '../models/assistente.model';

@Injectable({
  providedIn: 'root'
})
export class PlanoService {
  private apiUrl = `${environment.apiUrl}/api/custom/planos`;
  private baseApiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) { }

  simularGeracao(planoBlueprint: PlanoBlueprint): Observable<PlanoSimulacaoResponse> {
    return this.http.post<PlanoSimulacaoResponse>(
      `${this.apiUrl}/simular-geracao`,
      planoBlueprint
    );
  }

  getInfraestruturas(sort: string = 'id,asc'): Observable<Infraestrutura[]> {
    const params = new HttpParams().set('sort', sort);
    return this.http.get<Infraestrutura[]>(`${this.baseApiUrl}/infraestruturas`, { params });
  }

  getAssistentes(sort: string = 'id,asc'): Observable<Assistente[]> {
    const params = new HttpParams().set('sort', sort);
    return this.http.get<Assistente[]>(`${this.baseApiUrl}/assistentes`, { params });
  }
}
