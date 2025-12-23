import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { SetorDTO } from '../models/setor.model';

@Injectable({
  providedIn: 'root'
})
export class SetorService {
  private baseApiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) { }

  getAllSetors(sort: string = 'id,asc', page: number = 0, size: number = 100, eagerload: boolean = true): Observable<SetorDTO[]> {
    let params = new HttpParams()
      .set('sort', sort)
      .set('page', page.toString())
      .set('size', size.toString())
      .set('eagerload', eagerload.toString());
    
    return this.http.get<any>(`${this.baseApiUrl}/setors`, { params }).pipe(
      // A API retorna um objeto com 'content' array, então extraímos apenas o array
      map((response: any) => {
        if (Array.isArray(response)) {
          return response.filter((s: SetorDTO) => s.ativo !== false);
        }
        // Se for paginação, retorna o content
        const content = response.content || [];
        return content.filter((s: SetorDTO) => s.ativo !== false);
      })
    );
  }

  getSetorById(id: number, eagerload: boolean = true): Observable<SetorDTO> {
    // Para garantir que retorne os relacionamentos (assistentes, agentes), 
    // sempre busca da lista completa quando eagerload=true
    if (eagerload) {
      return this.getAllSetors('id,asc', 0, 100, true).pipe(
        map(setores => {
          const setor = setores.find(s => s.id === id);
          if (!setor) {
            throw new Error(`Setor com ID ${id} não encontrado`);
          }
          return setor;
        })
      );
    }
    // Se eagerload=false, busca diretamente pelo endpoint individual
    return this.http.get<SetorDTO>(`${this.baseApiUrl}/setors/${id}`);
  }
}
