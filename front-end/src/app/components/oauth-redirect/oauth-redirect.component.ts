import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-oauth-redirect',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="redirect-container">
      <div class="redirect-card">
        <div *ngIf="!error" class="loading-state">
          <div class="spinner-large"></div>
          <h2>Completando autenticación...</h2>
          <p>Por favor espera un momento</p>
        </div>

        <div *ngIf="error" class="error-state">
          <div class="error-icon">❌</div>
          <h2>Error de autenticación</h2>
          <p>{{ errorMessage }}</p>
          <button class="btn btn-primary" (click)="goToLogin()">
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .redirect-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .redirect-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      padding: 60px 40px;
      text-align: center;
      max-width: 400px;
      width: 100%;
    }

    .loading-state h2 {
      color: var(--dark-color);
      margin: 20px 0 10px;
      font-size: 24px;
    }

    .loading-state p {
      color: var(--gray-color);
      margin: 0;
    }

    .spinner-large {
      border: 4px solid #f3f3f3;
      border-top: 4px solid var(--primary-color);
      border-radius: 50%;
      width: 60px;
      height: 60px;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error-state {
      animation: shake 0.5s;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-10px); }
      75% { transform: translateX(10px); }
    }

    .error-icon {
      font-size: 64px;
      margin-bottom: 20px;
    }

    .error-state h2 {
      color: var(--danger-color);
      margin-bottom: 10px;
    }

    .error-state p {
      color: var(--gray-color);
      margin-bottom: 30px;
    }
  `]
})
export class OauthRedirectComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private router = inject(Router);

  error = false;
  errorMessage = '';

  ngOnInit(): void {
    // Capturar los parámetros de la URL
    this.route.queryParams.subscribe(params => {
      const accessToken = params['token'];
      const refreshToken = params['refreshToken'];
      const error = params['error'];

      if (error) {
        this.handleError(error);
        return;
      }

      if (accessToken && refreshToken) {
        this.handleOAuthSuccess(accessToken, refreshToken);
      } else {
        this.handleError('No se recibieron los tokens de autenticación.');
      }
    });
  }

  private handleOAuthSuccess(accessToken: string, refreshToken: string): void {
    this.authService.handleOAuthRedirect(accessToken, refreshToken).subscribe({
      next: () => {
        // El servicio ya maneja la navegación al dashboard
      },
      error: (error) => {
        this.handleError(error.message || 'Error al procesar la autenticación');
      }
    });
  }

  private handleError(message: string): void {
    this.error = true;
    this.errorMessage = message;
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
