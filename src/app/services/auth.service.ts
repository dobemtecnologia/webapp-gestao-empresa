import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LoginVM } from '../models/login-vm.model';
import { JWTToken } from '../models/jwt-token.model';
import { TokenStorageService } from './token-storage.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/api`;
  // Tentar múltiplos endpoints de autenticação
  private authEndpoints = [
    '/custom/auth/context',
    '/authenticate/context',
    '/authenticate'
  ];

  constructor(
    private http: HttpClient,
    private tokenStorage: TokenStorageService,
    private router: Router
  ) { }

  login(credentials: LoginVM): Observable<JWTToken> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    // Tentar primeiro endpoint
    return this.tryLogin(credentials, headers, 0);
  }

  private tryLogin(credentials: LoginVM, headers: HttpHeaders, endpointIndex: number): Observable<JWTToken> {
    if (endpointIndex >= this.authEndpoints.length) {
      return throwError(() => new Error('Nenhum endpoint de autenticação disponível'));
    }

    const endpoint = `${this.apiUrl}${this.authEndpoints[endpointIndex]}`;
    console.log(`🔐 Tentando login no endpoint: ${endpoint}`);

    return this.http.post<JWTToken>(endpoint, credentials, { headers }).pipe(
      tap(response => {
        if (response.id_token) {
          console.log(`✅ Login bem-sucedido no endpoint: ${endpoint}`);
          this.tokenStorage.saveToken(response.id_token);
          // Salva todas as informações do usuário retornadas pela API
          this.tokenStorage.saveUser(response);
        }
      }),
      catchError((error) => {
        console.warn(`⚠️ Falha no endpoint ${endpoint}:`, error.status);
        // Se não for o último endpoint, tentar o próximo
        if (endpointIndex < this.authEndpoints.length - 1) {
          console.log(`🔄 Tentando próximo endpoint...`);
          return this.tryLogin(credentials, headers, endpointIndex + 1);
        }
        // Se todos falharam, lançar o erro
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    this.tokenStorage.signOut();
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return this.tokenStorage.isLoggedIn();
  }

  getToken(): string | null {
    return this.tokenStorage.getToken();
  }

  checkAuthentication(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/api/authenticate`);
  }
}




