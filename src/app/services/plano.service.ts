import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PlanoBlueprint } from '../models/plano-blueprint.model';
import { PlanoSimulacaoResponse } from '../models/plano-simulacao-response.model';

@Injectable({
  providedIn: 'root'
})
export class PlanoService {
  private apiUrl = `${environment.apiUrl}/api/custom/planos`;

  constructor(private http: HttpClient) { }

  simularGeracao(planoBlueprint: PlanoBlueprint): Observable<PlanoSimulacaoResponse> {
    return this.http.post<PlanoSimulacaoResponse>(
      `${this.apiUrl}/simular-geracao`,
      planoBlueprint
    );
  }
}
