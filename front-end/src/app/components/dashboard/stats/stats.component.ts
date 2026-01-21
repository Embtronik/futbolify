import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  Page,
  StatsMatchHistoryItem,
  StatsMatchTeamWinner,
  StatsTeamAccess,
  StatsTopScorer,
} from '../../../models/football.model';
import { StatisticsService } from '../../../services/statistics.service';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="stats-container">
      <div class="page-header">
        <h1>Estadísticas</h1>
        <div class="sub">Estadísticas de grupos (partidos finalizados)</div>
      </div>

      <div class="card filters">
        <div class="row">
          <div class="field">
            <label>Grupo</label>
            <select [(ngModel)]="selectedTeamId" (ngModelChange)="onTeamChange()" [disabled]="loadingTeams">
              <option [ngValue]="null">Selecciona un grupo…</option>
              <option *ngFor="let t of teams" [ngValue]="t.teamId">{{ t.teamName }} ({{ t.role }})</option>
            </select>
          </div>

          <div class="field">
            <label>Año</label>
            <select [(ngModel)]="selectedYear" (ngModelChange)="onYearChange()" [disabled]="!selectedTeamId || loadingYears">
              <option [ngValue]="null">Selecciona año…</option>
              <option *ngFor="let y of years" [ngValue]="y">{{ y }}</option>
            </select>
          </div>

          <div class="field">
            <label>Mes (opcional)</label>
            <select [(ngModel)]="selectedMonth" (ngModelChange)="onMonthChange()" [disabled]="!selectedYear || loadingMonths">
              <option [ngValue]="null">Todo el año</option>
              <option *ngFor="let m of months" [ngValue]="m">{{ getMonthLabel(m) }}</option>
            </select>
          </div>

          <div class="field actions">
            <label>&nbsp;</label>
            <button type="button" class="btn btn-accent" (click)="refresh()" [disabled]="!canQuery || loadingData">{{ loadingData ? 'Cargando…' : 'Actualizar' }}</button>
          </div>
        </div>

        <div class="alert" *ngIf="errorMessage">{{ errorMessage }}</div>
        <div class="hint" *ngIf="!errorMessage">Tip: puedes ver todo el año o filtrar por mes.</div>
      </div>

      <div *ngIf="loadingTeams" class="skeleton">Cargando equipos…</div>

      <div *ngIf="!loadingTeams && teams.length === 0" class="empty-state">
        <div class="empty-icon">📊</div>
        <h2>No hay equipos disponibles</h2>
        <p>Debes ser OWNER o miembro APROBADO para ver estadísticas.</p>
      </div>

      <div *ngIf="teams.length > 0 && !selectedTeamId" class="empty-state">
        <div class="empty-icon">👥</div>
        <h2>Selecciona un grupo</h2>
        <p>Elige un grupo para cargar años/meses y métricas.</p>
      </div>

      <div *ngIf="selectedTeamId && selectedYear && dataLoaded" class="grid">
        <section class="card stat-card stat-card--history">
          <div class="card-head">
            <h2>Histórico de marcadores</h2>
            <div class="muted">{{ selectedMonth ? getMonthLabel(selectedMonth) : 'Todo el año' }} {{ selectedYear }}</div>
          </div>

          <div *ngIf="matchesPage?.content?.length === 0" class="empty">No hay partidos finalizados para el período.</div>

          <table *ngIf="matchesPage?.content?.length" class="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Marcador</th>
                <th class="muted">Lugar</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let m of matchesPage?.content">
                <td>{{ m.matchDateTime | date:'short' }}</td>
                <td>
                  <div class="scoreline">
                    <span class="team">
                      <span class="dot" [style.background]="m.teamA.color"></span>
                      <span [class.winner]="m.winnerMatchTeamId === m.teamA.matchTeamId">{{ m.teamA.name }}</span>
                    </span>
                    <span class="score">{{ m.teamA.goals }} - {{ m.teamB.goals }}</span>
                    <span class="team">
                      <span class="dot" [style.background]="m.teamB.color"></span>
                      <span [class.winner]="m.winnerMatchTeamId === m.teamB.matchTeamId">{{ m.teamB.name }}</span>
                    </span>
                  </div>
                </td>
                <td class="muted">{{ m.matchAddress || '—' }}</td>
              </tr>
            </tbody>
          </table>

          <div class="pager" *ngIf="matchesPage">
            <button type="button" class="btn" (click)="prevPage()" [disabled]="loadingData || matchesPage.page <= 0">Anterior</button>
            <div class="muted">Página {{ matchesPage.page + 1 }} / {{ matchesPage.totalPages || 1 }}</div>
            <button type="button" class="btn" (click)="nextPage()" [disabled]="loadingData || !!matchesPage.last">Siguiente</button>
          </div>
        </section>

        <section class="card stat-card stat-card--scorers">
          <div class="card-head">
            <h2>Top goleadores</h2>
            <div class="muted">Incluye autogoles</div>
          </div>

          <div *ngIf="topScorers.length === 0" class="empty">No hay datos para este período.</div>

          <table *ngIf="topScorers.length" class="table compact">
            <thead>
              <tr>
                <th>Jugador</th>
                <th class="num">Goles</th>
                <th class="num">Autogoles</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of topScorers">
                <td>
                  <div class="who">
                    <div class="name">{{ getScorerName(p) }}</div>
                    <div class="muted">{{ p.userEmail }}</div>
                  </div>
                </td>
                <td class="num">{{ p.goals }}</td>
                <td class="num">{{ p.ownGoals }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="card stat-card stat-card--winners">
          <div class="card-head">
            <h2>Equipos con más victorias</h2>
            <div class="muted">Agrupado por nombre/color</div>
          </div>

          <div *ngIf="winners.length === 0" class="empty">No hay datos para este período.</div>

          <table *ngIf="winners.length" class="table compact">
            <thead>
              <tr>
                <th>Equipo</th>
                <th class="num">Victorias</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let w of winners">
                <td>
                  <div class="team">
                    <span class="dot" [style.background]="w.color"></span>
                    <span>{{ w.name }}</span>
                  </div>
                </td>
                <td class="num">{{ w.wins }}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .stats-container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
    }

    .page-header h1 {
      font-size: 32px;
      font-weight: 700;
      color: var(--dark-color);
      margin: 0;
    }

    .sub{margin-top:6px;color:var(--gray-color);font-size:14px;}

    .card{background:#fff;border-radius:16px;border:1px solid var(--border-color);padding:18px;}
    .filters{
      margin-bottom:18px;
      position: relative;
      overflow: hidden;
      border: 1px solid rgba(15, 23, 42, 0.10);
      background: linear-gradient(180deg, rgba(34, 197, 94, 0.06) 0%, #ffffff 55%);
      box-shadow: 0 10px 26px rgba(15, 23, 42, 0.06);
    }
    .filters::before{
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: var(--primary-color);
    }
    .row{display:grid;grid-template-columns:1.2fr 0.9fr 0.9fr auto;gap:12px;align-items:end;}
    @media (max-width: 980px){.row{grid-template-columns:1fr;}}
    .field{display:flex;flex-direction:column;gap:6px;}
    label{font-size:12px;color:var(--gray-color);font-weight:700;}
    select{
      padding:10px 40px 10px 12px;
      border-radius:12px;
      border:2px solid rgba(15, 23, 42, 0.12);
      background:#fff;
      box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
      transition: var(--transition);
      appearance: none;
      background-image:
        linear-gradient(45deg, transparent 50%, rgba(71,85,105,.9) 50%),
        linear-gradient(135deg, rgba(71,85,105,.9) 50%, transparent 50%),
        linear-gradient(to right, transparent, transparent);
      background-position:
        calc(100% - 18px) 52%,
        calc(100% - 12px) 52%,
        100% 0;
      background-size: 6px 6px, 6px 6px, 2.5em 2.5em;
      background-repeat: no-repeat;
    }
    select:hover{border-color: rgba(34, 197, 94, 0.55);}
    select:focus{outline:none;border-color: var(--primary-dark);box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.18), 0 10px 20px rgba(15, 23, 42, 0.08);}
    select:disabled{
      cursor:not-allowed;
      background: rgba(248, 250, 252, 0.95);
      border-color: rgba(15, 23, 42, 0.10);
      box-shadow: none;
      opacity: 0.85;
    }
    .actions{display:flex;flex-direction:column;}

    .btn{border:1px solid var(--border-color);background:#fff;border-radius:12px;padding:10px 12px;font-weight:800;cursor:pointer;}
    .btn:hover{background:#f7f7f7;}
    .btn:disabled{opacity:.6;cursor:not-allowed;}

    /* Primary action (Actualizar) */
    .btn-accent{
      background: var(--primary-color);
      border: 2px solid var(--primary-dark);
      color: var(--white);
      box-shadow: 0 10px 22px rgba(34, 197, 94, 0.22);
    }
    .btn-accent:hover{background: var(--primary-dark);}
    .btn-accent:disabled{
      opacity: 1;
      background: #eef2f6;
      border-color: var(--border-color);
      color: var(--gray-dark);
      box-shadow: none;
    }
    .btn-accent:focus-visible{
      outline: 3px solid rgba(34, 197, 94, 0.35);
      outline-offset: 2px;
    }

    .alert{margin-top:10px;padding:10px 12px;border-radius:12px;border:1px solid rgba(239,68,68,.35);background:rgba(239,68,68,.08);color:#7f1d1d;font-weight:700;}
    .hint{margin-top:10px;color:var(--gray-color);font-size:13px;}

    .grid{display:grid;grid-template-columns:1.4fr 1fr 0.8fr;gap:16px;align-items:start;}
    @media (max-width: 1100px){.grid{grid-template-columns:1fr;}}

    /* Result cards: stronger visual separation */
    .stat-card{
      position: relative;
      border: 1px solid rgba(15, 23, 42, 0.10);
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
      background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
      overflow: hidden;
    }
    .stat-card::before{
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: var(--primary-color);
    }
    .stat-card--history{background: linear-gradient(180deg, #ffffff 0%, rgba(59, 130, 246, 0.06) 100%);}
    .stat-card--history::before{background: #3b82f6;}
    .stat-card--scorers{background: linear-gradient(180deg, #ffffff 0%, rgba(249, 115, 22, 0.08) 100%);}
    .stat-card--scorers::before{background: var(--secondary-color);}
    .stat-card--winners{background: linear-gradient(180deg, #ffffff 0%, rgba(34, 197, 94, 0.08) 100%);}
    .stat-card--winners::before{background: var(--primary-color);}

    .card-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:10px;}
    h2{margin:0;font-size:18px;color:var(--dark-color);}
    .muted{color:var(--gray-color);font-size:12px;}

    .table{width:100%;border-collapse:separate;border-spacing:0 8px;}
    .table th{font-size:12px;color:var(--gray-color);text-align:left;padding:0 10px;}
    .table td{background:#f9fafb;border:1px solid var(--border-color);padding:10px;border-left:none;border-right:none;}
    .table tbody tr td:first-child{border-left:1px solid var(--border-color);border-radius:12px 0 0 12px;}
    .table tbody tr td:last-child{border-right:1px solid var(--border-color);border-radius:0 12px 12px 0;}
    .compact td{padding:8px 10px;}
    .num{text-align:right;font-variant-numeric:tabular-nums;}

    .scoreline{display:flex;align-items:center;justify-content:space-between;gap:10px;}
    .team{display:inline-flex;align-items:center;gap:8px;}
    .dot{width:10px;height:10px;border-radius:999px;display:inline-block;}
    .score{font-weight:900;color:var(--dark-color);}
    .winner{font-weight:900;color:#166534;}

    .who .name{font-weight:900;color:var(--dark-color);}

    .pager{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;}
    .empty{color:var(--gray-color);font-size:13px;padding:12px 4px;}

    .skeleton{padding:10px 0;color:var(--gray-color);}

    .empty-state {
      background: white;
      border-radius: 16px;
      padding: 80px 40px;
      text-align: center;
      border: 2px dashed var(--border-color);
    }

    .empty-icon {
      font-size: 80px;
      margin-bottom: 24px;
    }

    .empty-state h2 {
      font-size: 24px;
      color: var(--dark-color);
      margin-bottom: 12px;
    }

    .empty-state p {
      font-size: 16px;
      color: var(--gray-color);
      margin-bottom: 32px;
    }
  `]
})
export class StatsComponent implements OnInit {
  private statsService = inject(StatisticsService);

  teams: StatsTeamAccess[] = [];
  years: number[] = [];
  months: number[] = [];

  selectedTeamId: number | null = null;
  selectedYear: number | null = null;
  selectedMonth: number | null = null;

  matchesPage: Page<StatsMatchHistoryItem> | null = null;
  topScorers: StatsTopScorer[] = [];
  winners: StatsMatchTeamWinner[] = [];

  loadingTeams = false;
  loadingYears = false;
  loadingMonths = false;
  loadingData = false;
  dataLoaded = false;

  errorMessage = '';

  page = 0;
  size = 20;
  scorersLimit = 20;

  get canQuery(): boolean {
    return !!this.selectedTeamId && !!this.selectedYear;
  }

  ngOnInit(): void {
    this.loadTeams();
  }

  private loadTeams(): void {
    this.loadingTeams = true;
    this.errorMessage = '';

    this.statsService.getStatsTeams().pipe(catchError(() => of([] as StatsTeamAccess[]))).subscribe({
      next: (teams) => {
        this.loadingTeams = false;
        this.teams = teams || [];
      },
      error: () => {
        this.loadingTeams = false;
        this.errorMessage = 'No se pudieron cargar los equipos.';
      }
    });
  }

  onTeamChange(): void {
    this.years = [];
    this.months = [];
    this.selectedYear = null;
    this.selectedMonth = null;
    this.resetData();

    if (!this.selectedTeamId) {
      return;
    }

    this.loadingYears = true;
    this.errorMessage = '';
    this.statsService.getTeamStatsYears(this.selectedTeamId).pipe(catchError(() => of([] as number[]))).subscribe({
      next: (years) => {
        this.loadingYears = false;
        this.years = (years || []).slice().sort((a, b) => b - a);
      },
      error: () => {
        this.loadingYears = false;
        this.errorMessage = 'No se pudieron cargar los años disponibles.';
      }
    });
  }

  onYearChange(): void {
    this.months = [];
    this.selectedMonth = null;
    this.page = 0;
    this.resetData();

    if (!this.selectedTeamId || !this.selectedYear) {
      return;
    }

    this.loadingMonths = true;
    this.statsService.getTeamStatsMonths(this.selectedTeamId, this.selectedYear).pipe(catchError(() => of([] as number[]))).subscribe({
      next: (months) => {
        this.loadingMonths = false;
        this.months = (months || []).slice().sort((a, b) => a - b);
        this.refresh();
      },
      error: () => {
        this.loadingMonths = false;
        this.errorMessage = 'No se pudieron cargar los meses disponibles.';
      }
    });
  }

  onMonthChange(): void {
    this.page = 0;
    this.refresh();
  }

  refresh(): void {
    if (!this.canQuery || !this.selectedTeamId || !this.selectedYear) {
      return;
    }

    this.loadingData = true;
    this.errorMessage = '';

    const teamId = this.selectedTeamId;
    const year = this.selectedYear;
    const month = this.selectedMonth;

    forkJoin({
      matches: this.statsService
        .getTeamStatsMatches(teamId, { year, month, page: this.page, size: this.size })
        .pipe(catchError(() => of(null))),
      scorers: this.statsService
        .getTeamTopScorers(teamId, { year, month, limit: this.scorersLimit })
        .pipe(catchError(() => of([] as StatsTopScorer[]))),
      winners: this.statsService.getMatchTeamWinners(teamId, { year, month }).pipe(catchError(() => of([] as StatsMatchTeamWinner[]))),
    }).subscribe({
      next: ({ matches, scorers, winners }) => {
        this.loadingData = false;
        this.dataLoaded = true;

        this.matchesPage = matches;
        this.topScorers = scorers || [];
        this.winners = winners || [];
      },
      error: () => {
        this.loadingData = false;
        this.errorMessage = 'No se pudieron cargar las estadísticas.';
      }
    });
  }

  prevPage(): void {
    if (!this.matchesPage) {
      return;
    }
    if ((this.matchesPage.page ?? 0) <= 0) {
      return;
    }
    this.page = (this.matchesPage.page ?? 0) - 1;
    this.refresh();
  }

  nextPage(): void {
    if (!this.matchesPage || this.matchesPage.last) {
      return;
    }
    this.page = (this.matchesPage.page ?? 0) + 1;
    this.refresh();
  }

  getMonthLabel(month: number): string {
    const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const idx = Number(month) - 1;
    return labels[idx] ? `${labels[idx]} (${month})` : String(month);
  }

  getScorerName(p: StatsTopScorer): string {
    const first = p.userInfo?.firstName?.trim();
    const last = p.userInfo?.lastName?.trim();
    const full = `${first ?? ''} ${last ?? ''}`.trim();
    return full || p.userEmail;
  }

  private resetData(): void {
    this.dataLoaded = false;
    this.matchesPage = null;
    this.topScorers = [];
    this.winners = [];
  }
}
