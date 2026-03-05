import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError, map, shareReplay, finalize } from 'rxjs/operators';
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
  
  // Para evitar múltiples refreshes simultáneos
  private refreshTokenInProgress = false;
  private refreshTokenSubject: Observable<AuthResponse> | null = null;

  // Timer para expiración proactiva del token
  private tokenExpirationTimer: ReturnType<typeof setTimeout> | null = null;
  // Intervalo de verificación periódica (fallback cada 60 segundos)
  private tokenCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Verificar si el token ha expirado al iniciar
    this.checkTokenExpiration();
    // Programar expiración si ya hay un token válido almacenado
    this.scheduleTokenExpiration();
    // Iniciar verificación periódica como respaldo
    this.startPeriodicCheck();
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
  handleOAuthRedirect(accessToken: string, refreshToken: string, expiresIn?: number): Observable<User> {
    // Guardar tokens con expiración si el backend la envía
    this.saveTokens(accessToken, refreshToken, expiresIn);
    // Programar refresco proactivo si tenemos fecha de expiración
    this.scheduleTokenExpiration();
    
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
   * Implementa patrón compartido para evitar múltiples refreshes simultáneos
   */
  refreshToken(): Observable<AuthResponse> {
    // Si ya hay un refresh en progreso, retornar el Observable compartido
    if (this.refreshTokenInProgress && this.refreshTokenSubject) {
      return this.refreshTokenSubject;
    }

    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    // Marcar que el refresh está en progreso
    this.refreshTokenInProgress = true;

    const request: RefreshTokenRequest = { refreshToken };
    
    // Crear Observable compartido para todos los suscriptores
    this.refreshTokenSubject = this.http.post<AuthResponse>(`${this.API_URL}/auth/refresh-token`, request)
      .pipe(
        tap(response => this.handleAuthSuccess(response)),
        catchError(error => {
          console.error('❌ Refresh token failed:', error);
          // No hacer logout aquí, lo maneja el interceptor
          return throwError(() => error);
        }),
        finalize(() => {
          // Limpiar el estado al finalizar (éxito o error)
          this.refreshTokenInProgress = false;
          this.refreshTokenSubject = null;
        }),
        shareReplay(1) // Compartir resultado con todas las suscripciones
      );

    return this.refreshTokenSubject;
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
   * @param navigate - Si debe navegar al login (por defecto true)
   */
  logout(navigate: boolean = true): void {
    console.log('🔴 Cerrando sesión...');
    // Cancelar temporizadores de expiración
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
      this.tokenExpirationTimer = null;
    }
    if (this.tokenCheckInterval) {
      clearInterval(this.tokenCheckInterval);
      this.tokenCheckInterval = null;
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiration');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    
    if (navigate) {
      this.router.navigate(['/auth/login']);
    }
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
    // Reprogramar temporizador de expiración con el nuevo token
    this.scheduleTokenExpiration();
  }

  private saveTokens(accessToken: string, refreshToken: string, expiresIn?: number): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    
    if (expiresIn) {
      // expiresIn viene en segundos desde el backend → convertir a milliseconds
      const expirationTime = new Date().getTime() + expiresIn * 1000;
      localStorage.setItem('tokenExpiration', expirationTime.toString());
    } else {
      // Fallback: extraer la expiración directamente del claim 'exp' del JWT.
      // Cubre el caso de OAuth/Google donde el redirect no incluye expiresIn.
      const jwtExpiry = this.getJwtExpiry(accessToken);
      if (jwtExpiry) {
        localStorage.setItem('tokenExpiration', jwtExpiry.toString());
      }
    }
  }

  /**
   * Decodifica el payload de un JWT y retorna la expiración en milisegundos,
   * o null si no se puede decodificar o no existe el claim exp.
   */
  private getJwtExpiry(token: string): number | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp ? payload.exp * 1000 : null;
    } catch {
      return null;
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
    if (expiration) {
      return new Date().getTime() < parseInt(expiration);
    }

    // Fallback: decodificar claim exp del JWT (cubre tokens OAuth sin expiresIn guardado)
    const jwtExpiry = this.getJwtExpiry(token);
    if (jwtExpiry) {
      return new Date().getTime() < jwtExpiry;
    }

    // Sin ninguna información de expiración, asumir válido
    return true;
  }

  private checkTokenExpiration(): void {
    if (!this.hasValidToken() && this.getRefreshToken()) {
      // Intentar refrescar el token automáticamente
      this.refreshToken().subscribe({
        error: () => this.logout()
      });
    } else if (!this.hasValidToken() && this.getAccessToken()) {
      // Token expirado y sin refresh token → redirigir al login
      console.warn('⚠️ Token expirado sin refresh token - cerrando sesión');
      this.logout();
    }
  }

  /**
   * Programa un temporizador para refrescar el token 60 segundos antes de que expire,
   * o para cerrar sesión si no hay refresh token disponible.
   */
  private scheduleTokenExpiration(): void {
    // Cancelar el temporizador anterior si existe
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
      this.tokenExpirationTimer = null;
    }

    const expiration = localStorage.getItem('tokenExpiration');
    if (!expiration) return;

    const expiresAt = parseInt(expiration);
    const now = new Date().getTime();

    // Si ya expiró, actuar de inmediato
    if (expiresAt <= now) {
      console.warn('⚠️ scheduleTokenExpiration: token ya expirado al programar');
      this.checkTokenExpiration();
      return;
    }

    // Refrescar 60 segundos antes de que expire (mínimo 1 segundo)
    const msUntilRefresh = Math.max(expiresAt - now - 60_000, 1_000);

    console.log(`🕐 Token se refrescará en ${Math.round(msUntilRefresh / 1000)}s`);

    this.tokenExpirationTimer = setTimeout(() => {
      if (this.getRefreshToken()) {
        console.log('🔄 Refrescando token proactivamente...');
        this.refreshToken().subscribe({
          error: () => {
            console.error('🔴 Refresh proactivo fallido - cerrando sesión');
            this.logout();
          }
        });
      } else {
        console.warn('⚠️ Token por expirar sin refresh token - cerrando sesión');
        this.logout();
      }
    }, msUntilRefresh);
  }

  /**
   * Verificación periódica cada 60 segundos como fallback,
   * por si el temporizador principal falla o la pestaña estuvo inactiva.
   */
  private startPeriodicCheck(): void {
    if (this.tokenCheckInterval) {
      clearInterval(this.tokenCheckInterval);
    }
    this.tokenCheckInterval = setInterval(() => {
      if (this.getAccessToken() && !this.hasValidToken()) {
        console.warn('⚠️ Verificación periódica: token expirado');
        this.checkTokenExpiration();
      }
    }, 60_000);
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
