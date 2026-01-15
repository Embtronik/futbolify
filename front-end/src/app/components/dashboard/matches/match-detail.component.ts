import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TeamService } from '../../../services/team.service';
import { TeamMatch, TeamMatchAttendance, MatchAttendanceStatus } from '../../../models/football.model';

@Component({
  selector: 'app-match-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="match-detail-container" *ngIf="initialized">
      <div class="card" *ngIf="!loadingMatch && match; else loadingTpl">
        <h1>Detalle del partido</h1>

        <div class="match-info">
          <p class="match-date">
            {{ match.matchDateTime | date:'EEEE d \\de MMMM, HH:mm' }}
          </p>
          <p class="match-address">
            {{ match.address }}
          </p>
        </div>

        <div class="actions">
          <button type="button" class="btn yes" (click)="confirmAttendance(true)" [disabled]="saving">
            Sí asistiré
          </button>
          <button type="button" class="btn no" (click)="confirmAttendance(false)" [disabled]="saving">
            No asistiré
          </button>
        </div>

        <h2>Asistencia de jugadores</h2>

        <div *ngIf="loadingAttendance" class="state">
          <div class="spinner"></div>
          <p>Cargando asistencia...</p>
        </div>

        <table *ngIf="!loadingAttendance && attendance.length > 0" class="attendance-table">
          <thead>
            <tr>
              <th>Jugador</th>
              <th>Email</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of attendance">
              <td>{{ getDisplayName(item) }}</td>
              <td>{{ item.userEmail }}</td>
              <td>
                <span [ngClass]="getStatusClass(item.status)">
                  {{ getStatusLabel(item.status) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <p *ngIf="!loadingAttendance && attendance.length === 0" class="no-data">
          Aún no hay información de asistencia para este partido.
        </p>
      </div>

      <ng-template #loadingTpl>
        <div class="card state">
          <div class="spinner"></div>
          <p>Cargando información del partido...</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .match-detail-container {
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      padding: 24px 16px;
      background: var(--light-color, #f3f4f6);
    }

    .card {
      background: #fff;
      border-radius: 16px;
      padding: 24px 28px;
      max-width: 720px;
      width: 100%;
      box-shadow: 0 10px 35px rgba(0, 0, 0, 0.08);
    }

    h1 {
      font-size: 24px;
      margin-bottom: 12px;
      color: var(--dark-color, #111827);
    }

    h2 {
      font-size: 18px;
      margin-top: 24px;
      margin-bottom: 8px;
      color: var(--dark-color, #111827);
    }

    .match-info {
      margin-bottom: 16px;
    }

    .match-date {
      font-weight: 600;
    }

    .match-address {
      color: var(--gray-color, #6b7280);
    }

    .actions {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }

    .btn {
      flex: 1;
      padding: 10px 16px;
      border-radius: 999px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      color: #fff;
    }

    .btn.yes {
      background: var(--primary-color, #22c55e);
    }

    .btn.no {
      background: #ef4444;
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

    .attendance-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }

    .attendance-table th,
    .attendance-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #e5e7eb;
      text-align: left;
      font-size: 14px;
    }

    .attendance-table th {
      font-weight: 600;
      color: var(--gray-color, #6b7280);
    }

    .attendance-table td span {
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
    }

    .status-attending {
      background: rgba(34, 197, 94, 0.1);
      color: #166534;
    }

    .status-not-attending {
      background: rgba(239, 68, 68, 0.1);
      color: #b91c1c;
    }

    .status-pending {
      background: rgba(234, 179, 8, 0.1);
      color: #854d0e;
    }

    .no-data {
      margin-top: 8px;
      color: var(--gray-color, #6b7280);
    }
  `]
})
export class MatchDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private teamService = inject(TeamService);

  teamId!: number;
  matchId!: number;

  match: TeamMatch | null = null;
  attendance: TeamMatchAttendance[] = [];

  loadingMatch = true;
  loadingAttendance = true;
  saving = false;
  initialized = false;

  ngOnInit(): void {
    const teamIdParam = this.route.snapshot.paramMap.get('teamId');
    const matchIdParam = this.route.snapshot.paramMap.get('matchId');

    if (!teamIdParam || !matchIdParam) {
      this.router.navigate(['/dashboard', 'home']);
      return;
    }

    this.teamId = Number(teamIdParam);
    this.matchId = Number(matchIdParam);

    if (!Number.isFinite(this.teamId) || !Number.isFinite(this.matchId)) {
      this.router.navigate(['/dashboard', 'home']);
      return;
    }

    this.initialized = true;

    this.loadMatch();
    this.loadAttendance();
  }

  private loadMatch(): void {
    this.loadingMatch = true;
    this.teamService.getMatches(this.teamId).subscribe({
      next: (matches) => {
        this.match = (matches || []).find(m => m.id === this.matchId) || null;
        this.loadingMatch = false;
      },
      error: () => {
        this.loadingMatch = false;
      }
    });
  }

  private loadAttendance(): void {
    this.loadingAttendance = true;
    this.teamService.getMatchAttendance(this.teamId, this.matchId).subscribe({
      next: (list) => {
        this.attendance = list || [];
        this.loadingAttendance = false;
      },
      error: () => {
        this.loadingAttendance = false;
      }
    });
  }

  confirmAttendance(attending: boolean): void {
    this.saving = true;
    this.teamService.confirmMatchAttendance(this.teamId, this.matchId, attending).subscribe({
      next: () => {
        this.saving = false;
        this.loadAttendance();
      },
      error: () => {
        this.saving = false;
      }
    });
  }

  getDisplayName(item: TeamMatchAttendance): string {
    const info = item.userInfo;
    if (info?.fullName) {
      return info.fullName;
    }
    if (info?.firstName || info?.lastName) {
      return `${info.firstName || ''} ${info.lastName || ''}`.trim();
    }
    return item.userEmail;
  }

  getStatusLabel(status: MatchAttendanceStatus): string {
    switch (status) {
      case 'ATTENDING':
        return 'Sí asiste';
      case 'NOT_ATTENDING':
        return 'No asiste';
      default:
        return 'Pendiente';
    }
  }

  getStatusClass(status: MatchAttendanceStatus): string {
    switch (status) {
      case 'ATTENDING':
        return 'status-attending';
      case 'NOT_ATTENDING':
        return 'status-not-attending';
      default:
        return 'status-pending';
    }
  }
}
