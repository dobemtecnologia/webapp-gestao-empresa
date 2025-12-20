import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginVM } from '../models/login-vm.model';
import { JWTToken } from '../models/jwt-token.model';
import { TokenStorageService } from './token-storage.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/api/authenticate/context`;

  constructor(
    private http: HttpClient,
    private tokenStorage: TokenStorageService,
    private router: Router
  ) { }

  login(credentials: LoginVM): Observable<JWTToken> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<JWTToken>(this.apiUrl, credentials, { headers }).pipe(
      tap(response => {
        if (response.id_token) {
          this.tokenStorage.saveToken(response.id_token);
          // Salva todas as informações do usuário retornadas pela API
          this.tokenStorage.saveUser(response);
        }
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




