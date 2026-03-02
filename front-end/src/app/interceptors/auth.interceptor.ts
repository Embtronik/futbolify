import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  // No agregar token a las peticiones de autenticación, OAuth y APIs externas
  const isAuthEndpoint = req.url.includes('/auth/') || req.url.includes('/oauth2/');
  // Tratar /api/football como API externa (aunque esté detrás de proxy) para no filtrar JWT propio
  const isExternalApi = req.url.startsWith('/api/football') || (req.url.startsWith('http') && !req.url.includes('localhost') && !req.url.includes('127.0.0.1'));
  
  // Log para debug
  
  // Clonar la petición y agregar el token si existe
  let authReq = req;
  if (token && !isAuthEndpoint && !isExternalApi) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  } else if (!isAuthEndpoint && !isExternalApi && req.method !== 'GET') {
    // Para peticiones sin token pero que no sean GET, agregar Content-Type
    authReq = req.clone({
      setHeaders: {
        'Content-Type': 'application/json'
      }
    });
  }


  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const router = inject(Router);
      // Si el error es 401 (no autorizado) y no es un endpoint de auth ni API externa
      if (error.status === 401 && !isAuthEndpoint && !isExternalApi) {
        // Verificar si es el endpoint de refresh-token que está fallando
        const isRefreshEndpoint = req.url.includes('/auth/refresh-token');
        
        if (isRefreshEndpoint) {
          // Si el refresh-token falló, logout inmediato sin reintentar
          console.error('🔴 Refresh token expirado - redirigiendo a login');
          authService.logout(false); // No navegar desde el servicio
          router.navigate(['/auth/login'], { 
            queryParams: { expired: 'true' },
            replaceUrl: true 
          });
          return throwError(() => error);
        }
        
        // Intentar refrescar el token solo si no es el endpoint de refresh
        return authService.refreshToken().pipe(
          switchMap(() => {
            // Reintentar la petición original con el nuevo token
            const newToken = authService.getAccessToken();
            const retryReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newToken}`,
                'Content-Type': 'application/json'
              }
            });
            return next(retryReq);
          }),
          catchError((refreshError) => {
            // Si falla el refresh, cerrar sesión y redirigir al login
            console.error('🔴 Error al refrescar token - redirigiendo a login');
            authService.logout(false); // No navegar desde el servicio
            router.navigate(['/auth/login'], { 
              queryParams: { expired: 'true' },
              replaceUrl: true 
            });
            return throwError(() => refreshError);
          })
        );
      }
      // Si el backend devuelve 403 indicando que debe aceptar términos, redirigir
      try {
        const msg = (error.error && (error.error.message || error.error.error)) || '';
        if (error.status === 403 && typeof msg === 'string' && msg.toLowerCase().includes('termin')) {
          // Navigate to terms acceptance screen
          router.navigate(['/terms']);
        }
      } catch (e) { /* ignore */ }
      
      return throwError(() => error);
    })
  );
};
