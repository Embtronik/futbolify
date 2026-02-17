import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthResponse, LoginRequest, RegisterRequest, RefreshTokenRequest } from '../models/auth.model';
import { User, UpdateUserRequest, ChangePasswordRequest } from '../models/user.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private readonly OAUTH_URL = environment.oauthUrl;
  
  private http = inject(HttpClient);
  private router = inject(Router);
  
  private currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasValidToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor() {
    // Verificar si el token ha expirado al iniciar
    this.checkTokenExpiration();
  }

  /**
   * Registro de usuario con email y password
   */
  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/register`, data)
      .pipe(
        tap(response => this.handleAuthSuccess(response)),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Login con email y password
   */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        tap(response => this.handleAuthSuccess(response)),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Iniciar autenticación con Google OAuth2
   * Redirige al navegador a Google
   */
  loginWithGoogle(): void {
    window.location.href = `${this.OAUTH_URL}/google`;
  }

  /**
   * Procesar tokens OAuth2 recibidos desde la URL de redirección
   */
  handleOAuthRedirect(accessToken: string, refreshToken: string): Observable<User> {
    // Guardar tokens
    this.saveTokens(accessToken, refreshToken);
    
    // Obtener información del usuario
    return this.getCurrentUser().pipe(
      tap(user => {
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
        this.router.navigate(['/dashboard']);
      })
    );
  }

  /**
   * Refrescar el access token usando el refresh token
   */
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    const request: RefreshTokenRequest = { refreshToken };
    
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/refresh-token`, request)
      .pipe(
        tap(response => this.handleAuthSuccess(response)),
        catchError(error => {
          this.logout();
          return throwError(() => error);
        })
      );
  }

  /**
   * Verificar email del usuario
   */
  verifyEmail(token: string): Observable<{ message: string }> {
    return this.http.get<{ message: string }>(`${this.API_URL}/auth/verify-email?token=${token}`)
      .pipe(
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Obtener datos del usuario autenticado
   */
  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/user/me`)
      .pipe(
        tap(user => {
          this.saveUser(user);
          this.currentUserSubject.next(user);
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Actualizar datos del usuario autenticado
   * - Usuarios OAuth: solo countryCode y phoneNumber
   * - Usuarios locales: firstName, lastName, countryCode, phoneNumber
   */
  updateUser(data: UpdateUserRequest): Observable<User> {
    return this.http.put<User>(`${this.API_URL}/user/me`, data)
      .pipe(
        tap(user => {
          this.saveUser(user);
          this.currentUserSubject.next(user);
        }),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Cambiar contraseña (solo usuarios locales)
   */
  changePassword(data: ChangePasswordRequest): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.API_URL}/user/me/password`, data)
      .pipe(
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Cerrar sesión
   */
  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiration');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/login']);
  }

  /**
   * Obtener el access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  /**
   * Obtener el refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return this.hasValidToken();
  }

  /**
   * Obtener el usuario actual
   */
  getCurrentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  // ========== MÉTODOS PRIVADOS ==========

  private handleAuthSuccess(response: AuthResponse): void {
    this.saveTokens(response.accessToken, response.refreshToken, response.expiresIn);
    this.saveUser(response.user);
    this.currentUserSubject.next(response.user);
    this.isAuthenticatedSubject.next(true);
  }

  private saveTokens(accessToken: string, refreshToken: string, expiresIn?: number): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    
    if (expiresIn) {
      const expirationTime = new Date().getTime() + expiresIn;
      localStorage.setItem('tokenExpiration', expirationTime.toString());
    }
  }

  private saveUser(user: User): void {
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  private getUserFromStorage(): User | null {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  }

  private hasValidToken(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    const expiration = localStorage.getItem('tokenExpiration');
    if (!expiration) return true; // Si no hay expiración, asumimos válido

    return new Date().getTime() < parseInt(expiration);
  }

  private checkTokenExpiration(): void {
    if (!this.hasValidToken() && this.getRefreshToken()) {
      // Intentar refrescar el token automáticamente
      this.refreshToken().subscribe({
        error: () => this.logout()
      });
    } else if (!this.hasValidToken()) {
      this.logout();
    }
  }

  private handleError(error: any): Observable<never> {
    let errorMessage = 'Ha ocurrido un error';
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = error.error.message;
    } else {
      // Error del lado del servidor
      if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.status === 0) {
        errorMessage = 'No se puede conectar con el servidor';
      } else {
        errorMessage = `Error: ${error.status} - ${error.statusText}`;
      }
    }
    
    return throwError(() => ({ message: errorMessage, originalError: error }));
  }
}
