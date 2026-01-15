import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TeamService } from '../../../services/team.service';

@Component({
  selector: 'app-match-attendance',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="attendance-container">
      <div class="card">
        <h1>Confirmación de asistencia</h1>

        <div *ngIf="loading" class="state">
          <div class="spinner"></div>
          <p>Procesando tu respuesta...</p>
        </div>

        <div *ngIf="!loading && success === true" class="state success">
          <p>{{ successMessage }}</p>
          <button type="button" (click)="goToDashboard()">Ir al dashboard</button>
        </div>

        <div *ngIf="!loading && success === false" class="state error">
          <p>{{ errorMessage }}</p>
          <button type="button" (click)="goToDashboard()">Ir al dashboard</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .attendance-container {
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: var(--light-color, #f3f4f6);
      padding: 16px;
    }

    .card {
      background: #fff;
      border-radius: 16px;
      padding: 24px 28px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 10px 35px rgba(0, 0, 0, 0.08);
      text-align: center;
    }

    h1 {
      font-size: 22px;
      margin-bottom: 16px;
      color: var(--dark-color, #111827);
    }

    .state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border-radius: 999px;
      border: 4px solid #e5e7eb;
      border-top-color: var(--primary-color, #22c55e);
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .success p {
      color: var(--primary-color, #22c55e);
    }

    .error p {
      color: #ef4444;
    }

    button {
      margin-top: 8px;
      padding: 8px 16px;
      border-radius: 999px;
      border: none;
      background: var(--primary-color, #22c55e);
      color: #fff;
      font-weight: 600;
      cursor: pointer;
    }
  `]
})
export class MatchAttendanceComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private teamService = inject(TeamService);

  loading = true;
  success: boolean | null = null;
  successMessage = '';
  errorMessage = 'No se pudo procesar tu confirmación. Inténtalo de nuevo más tarde.';

  constructor() {
    this.processAttendance();
  }

  private processAttendance(): void {
    const params = this.route.snapshot.queryParamMap;
    const teamIdParam = params.get('teamId');
    const matchIdParam = params.get('matchId');
    const attendingParam = params.get('attending');

    if (!teamIdParam || !matchIdParam || attendingParam === null) {
      this.loading = false;
      this.success = false;
      this.errorMessage = 'Faltan datos para procesar tu confirmación.';
      return;
    }

    const teamId = Number(teamIdParam);
    const matchId = Number(matchIdParam);
    const attending = attendingParam === 'true';

    if (!Number.isFinite(teamId) || !Number.isFinite(matchId)) {
      this.loading = false;
      this.success = false;
      this.errorMessage = 'Los datos del partido no son válidos.';
      return;
    }

    this.teamService.confirmMatchAttendance(teamId, matchId, attending).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        this.successMessage = attending
          ? '¡Listo! Registramos que asistirás al partido.'
          : 'Registramos que no asistirás al partido.';
      },
      error: () => {
        this.loading = false;
        this.success = false;
      },
    });
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard', 'home']);
  }
}
