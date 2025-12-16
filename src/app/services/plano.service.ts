import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { PlanoBlueprint } from '../models/plano-blueprint.model';
import { PlanoSimulacaoResponse } from '../models/plano-simulacao-response.model';
import { Infraestrutura } from '../models/infraestrutura.model';
import { Assistente } from '../models/assistente.model';
import { Canal } from '../models/canal.model';
import { PeriodoContratacao } from '../models/periodo-contratacao.model';
import { VendedorDTO } from '../models/vendedor.model';

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

  getCanals(sort: string = 'id,asc'): Observable<Canal[]> {
    const params = new HttpParams().set('sort', sort);
    return this.http.get<Canal[]>(`${this.baseApiUrl}/canals`, { params });
  }

  getPeriodosContratacao(sort: string = 'id,asc'): Observable<PeriodoContratacao[]> {
    const params = new HttpParams().set('sort', sort);
    return this.http.get<PeriodoContratacao[]>(`${this.baseApiUrl}/periodo-contratacaos`, { params });
  }

  getVendedors(sort: string = 'id,asc', page: number = 0, size: number = 20): Observable<VendedorDTO[]> {
    let params = new HttpParams()
      .set('sort', sort)
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.get<any>(`${this.baseApiUrl}/vendedors`, { params }).pipe(
      // A API retorna um objeto com 'content' array, então extraímos apenas o array
      map((response: any) => {
        if (Array.isArray(response)) {
          return response;
        }
        // Se for paginação, retorna o content
        return response.content || [];
      })
    );
  }
}
