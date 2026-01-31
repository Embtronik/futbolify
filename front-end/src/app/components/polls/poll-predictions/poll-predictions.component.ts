import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChildren, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { PollService } from '../../../services/poll.service';
import { Poll, PollMatch, PollPrediction, CreatePredictionRequest, PartidoMarcadorResponse } from '../../../models/football.model';

interface MatchWithPrediction {
  match: PollMatch;
  prediction?: PollPrediction;
  golesLocal: number | null;
  golesVisitante: number | null;
  timeRemaining: { hours: number; minutes: number; expired: boolean };
  canPredict: boolean;
}

@Component({
  selector: 'app-poll-predictions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="predictions-container">
      <div class="header">
        <div class="header-left">
          <button class="btn-back" (click)="goBack()">
            ← Volver
          </button>
          <div>
            <h2>{{ poll?.nombre }}</h2>
            <p class="subtitle">Haz tus pronósticos</p>
          </div>
        </div>
        <div class="poll-status">
          <span class="badge" [class]="'badge-' + poll?.estado?.toLowerCase()">
            {{ getStatusLabel(poll?.estado) }}
          </span>
        </div>
      </div>

      <div *ngIf="loading" class="loading">
        Cargando partidos...
      </div>

      <div *ngIf="!loading && matches.length === 0" class="empty-state">
        <p>No hay partidos disponibles para esta polla</p>
      </div>

      <div *ngIf="!loading && matches.length > 0" class="matches-section">
        <div class="info-banner">
          <span class="icon">ℹ️</span>
          <span>Los pronósticos se cierran 5 minutos antes del inicio de cada partido</span>
        </div>

        <div class="matches-list">
          <div 
            *ngFor="let item of matches" 
            #matchCard
            class="match-card"
            [attr.data-match-id]="item.match.id"
            [class.expired]="item.timeRemaining.expired"
            [class.has-prediction]="item.prediction">
            
            <!-- Match Header -->
            <div class="match-header">
              <div class="match-date">
                {{ formatDate(item.match.fechaHoraPartido) }}
              </div>
              <div class="countdown" [class.warning]="item.timeRemaining.hours === 0 && item.timeRemaining.minutes <= 30">
                <span *ngIf="!item.timeRemaining.expired">
                  ⏱️ Cierra en: {{ item.timeRemaining.hours }}h {{ item.timeRemaining.minutes }}m
                </span>
                <span *ngIf="item.timeRemaining.expired" class="expired-label">
                  🔒 Cerrado
                </span>
              </div>
            </div>

            <!-- Pronóstico + marcador real -->
            <div class="scores-grid">
              <div class="pred-box">
                <div class="pred-title">Tu pronóstico</div>

                <div class="match-teams">
                  <div class="team team-local">
                    <span class="team-name">{{ item.match.equipoLocal }}</span>
                    <div class="score-input">
                      <input 
                        type="number" 
                        [(ngModel)]="item.golesLocal"
                        [disabled]="!item.canPredict"
                        min="0"
                        max="99"
                        placeholder="-"
                        (ngModelChange)="onPredictionChange(item)"
                        class="score-field">
                    </div>
                  </div>

                  <div class="vs-separator">VS</div>

                  <div class="team team-visitante">
                    <div class="score-input">
                      <input 
                        type="number" 
                        [(ngModel)]="item.golesVisitante"
                        [disabled]="!item.canPredict"
                        min="0"
                        max="99"
                        placeholder="-"
                        (ngModelChange)="onPredictionChange(item)"
                        class="score-field">
                    </div>
                    <span class="team-name">{{ item.match.equipoVisitante }}</span>
                  </div>
                </div>
              </div>

              <div class="real-box">
                <div class="real-head">
                  <div class="real-title">
                    <span>Marcador real</span>
                    <span
                      *ngIf="getRealScore(item.match.id) as rs"
                      class="status-pill"
                      [class.live]="isLiveStatus(rs.apiStatusShort) && !rs.partidoFinalizado"
                      [class.final]="rs.partidoFinalizado"
                    >
                      {{ rs.apiStatusShort || '—' }}
                    </span>
                  </div>

                  <button
                    type="button"
                    class="btn-mini"
                    [disabled]="isRealScoreLoading(item.match.id)"
                    (click)="loadRealScore(item.match.id, true)"
                    aria-label="Actualizar marcador real"
                    title="Actualizar marcador real"
                  >
                    ⟳
                  </button>
                </div>

                <div *ngIf="isRealScoreLoading(item.match.id) && !getRealScore(item.match.id)" class="real-muted">
                  Cargando marcador…
                </div>

                <div *ngIf="getRealScoreError(item.match.id)" class="real-error">
                  No se pudo cargar el marcador real.
                </div>

                <ng-container *ngIf="getRealScore(item.match.id) as rs">
                  <div class="real-scoreline">
                    <span class="real-team">{{ item.match.equipoLocal }}</span>
                    <span class="real-score">{{ rs.golesLocal ?? '—' }} - {{ rs.golesVisitante ?? '—' }}</span>
                    <span class="real-team">{{ item.match.equipoVisitante }}</span>
                  </div>

                  <div class="real-finished" *ngIf="rs.partidoFinalizado">
                    Match Finished
                  </div>
                </ng-container>
              </div>
            </div>

            <!-- Match Footer -->
            <div class="match-footer">
              <div class="prediction-status">
                <span *ngIf="item.prediction" class="status-saved">
                  ✓ Pronóstico guardado
                </span>
                <span *ngIf="!item.prediction && !item.timeRemaining.expired" class="status-pending">
                  Sin pronóstico
                </span>
                <span *ngIf="!item.prediction && item.timeRemaining.expired" class="status-missed">
                  No participaste
                </span>
              </div>

              <button 
                *ngIf="item.canPredict"
                class="btn-save"
                [disabled]="!canSavePrediction(item) || savingPrediction === item.match.id"
                (click)="savePrediction(item)">
                {{ savingPrediction === item.match.id ? 'Guardando...' : 'Guardar Pronóstico' }}
              </button>
            </div>

            <!-- Warning for expired -->
            <div *ngIf="item.timeRemaining.expired && !item.prediction" class="warning-message">
              Ya no puedes hacer un pronóstico para este partido
            </div>

            <!-- Warning for imminent closure -->
            <div *ngIf="!item.timeRemaining.expired && item.timeRemaining.hours === 0 && item.timeRemaining.minutes <= 10" class="urgency-message">
              ⚠️ ¡El pronóstico cierra pronto! No olvides guardar tu predicción
            </div>
          </div>
        </div>
      </div>

      <!-- Summary Footer -->
      <div *ngIf="!loading && matches.length > 0" class="summary-footer">
        <div class="summary-stats">
          <div class="stat">
            <span class="stat-value">{{ getTotalMatches() }}</span>
            <span class="stat-label">Total Partidos</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ getPredictedMatches() }}</span>
            <span class="stat-label">Pronosticados</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ getPendingMatches() }}</span>
            <span class="stat-label">Pendientes</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ getMissedMatches() }}</span>
            <span class="stat-label">Perdidos</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .predictions-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .btn-back {
      padding: 0.5rem 1rem;
      background: #f0f0f0;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-back:hover {
      background: #e0e0e0;
    }

    h2 {
      margin: 0;
      font-size: 1.8rem;
      font-weight: 700;
      color: #1a1a1a;
    }

    .subtitle {
      margin: 0.25rem 0 0 0;
      color: #666;
      font-size: 0.9rem;
    }

    .poll-status .badge {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .badge-creada {
      background: #e3f2fd;
      color: #1976d2;
    }

    .badge-abierta {
      background: #e8f5e9;
      color: #388e3c;
    }

    .badge-cerrada {
      background: #fff3e0;
      color: #f57c00;
    }

    .badge-finalizada {
      background: #f5f5f5;
      color: #616161;
    }

    .loading {
      text-align: center;
      padding: 3rem;
      color: #666;
      font-size: 1.1rem;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: #666;
    }

    .info-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      background: #e3f2fd;
      border-radius: 8px;
      color: #1976d2;
      margin-bottom: 1.5rem;
    }

    .info-banner .icon {
      font-size: 1.2rem;
    }

    .matches-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .match-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: all 0.3s;
    }

    .match-card.expired {
      opacity: 0.7;
      background: #f5f5f5;
    }

    .match-card.has-prediction {
      border: 2px solid #00b894;
    }

    .match-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #e0e0e0;
    }

    .match-date {
      font-weight: 600;
      color: #444;
    }

    .countdown {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: #e8f5e9;
      color: #2e7d32;
      border-radius: 20px;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .countdown.warning {
      background: #fff3e0;
      color: #f57c00;
    }

    .expired-label {
      color: #d63031;
    }

    .match-teams {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 2rem;
      align-items: center;
      margin-bottom: 0;
      padding: 1rem;
    }

    .scores-grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .pred-box {
      background: rgba(0, 184, 148, 0.06);
      border: 1px solid rgba(0, 184, 148, 0.20);
      border-radius: 12px;
      overflow: hidden;
    }

    .pred-title {
      font-weight: 800;
      font-size: 0.85rem;
      color: #065f46;
      padding: 0.85rem 1rem;
      background: rgba(0, 184, 148, 0.12);
      border-bottom: 1px solid rgba(0, 184, 148, 0.20);
    }

    .real-box {
      background: rgba(102, 126, 234, 0.05);
      border: 1px solid rgba(102, 126, 234, 0.18);
      border-radius: 12px;
      padding: 0.95rem 1rem;
    }

    .real-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
    }

    .real-title {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-weight: 800;
      color: #1a1a1a;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.25rem 0.55rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 900;
      background: rgba(26, 26, 26, 0.08);
      color: #1a1a1a;
      border: 1px solid rgba(26, 26, 26, 0.12);
    }

    .status-pill.live {
      background: rgba(0, 184, 148, 0.14);
      color: #065f46;
      border-color: rgba(0, 184, 148, 0.30);
    }

    .status-pill.final {
      background: rgba(97, 97, 97, 0.12);
      color: #475569;
      border-color: rgba(100, 116, 139, 0.28);
    }

    .btn-mini {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      border: 1px solid rgba(26, 26, 26, 0.14);
      background: #fff;
      cursor: pointer;
      box-shadow: 0 6px 14px rgba(0, 0, 0, 0.08);
      font-weight: 900;
      transition: all 0.2s;
    }

    .btn-mini:hover:not(:disabled) {
      background: #f8f9fa;
      transform: translateY(-1px);
    }

    .btn-mini:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      box-shadow: none;
    }

    .btn-mini:focus-visible {
      outline: 3px solid rgba(102, 126, 234, 0.18);
      outline-offset: 2px;
    }

    .real-scoreline {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin: 0.3rem 0 0.75rem 0;
    }

    .real-team {
      font-size: 0.85rem;
      color: #1a1a1a;
      font-weight: 700;
      max-width: 45%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .real-score {
      font-size: 1.1rem;
      font-weight: 900;
      color: #1a1a1a;
      background: rgba(255, 255, 255, 0.85);
      border: 1px solid rgba(26, 26, 26, 0.10);
      padding: 0.35rem 0.6rem;
      border-radius: 12px;
      min-width: 92px;
      text-align: center;
    }

    .real-finished {
      margin-top: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-size: 0.9rem;
      font-weight: 900;
      color: #334155;
      background: rgba(100, 116, 139, 0.12);
      border: 1px solid rgba(100, 116, 139, 0.28);
      padding: 0.6rem 0.75rem;
      border-radius: 12px;
    }

    .real-muted {
      font-size: 0.85rem;
      color: #666;
      padding: 0.35rem 0;
    }

    .real-error {
      font-size: 0.85rem;
      color: #991b1b;
      background: rgba(214, 48, 49, 0.08);
      border: 1px solid rgba(214, 48, 49, 0.25);
      padding: 0.5rem 0.6rem;
      border-radius: 10px;
    }

    .team {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .team-local {
      flex-direction: row;
    }

    .team-visitante {
      flex-direction: row-reverse;
    }

    .team-name {
      flex: 1;
      font-weight: 700;
      font-size: 1.2rem;
      color: #1a1a1a;
    }

    .team-local .team-name {
      text-align: right;
    }

    .team-visitante .team-name {
      text-align: left;
    }

    .score-input {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .score-field {
      width: 80px;
      height: 80px;
      font-size: 2rem;
      font-weight: 700;
      text-align: center;
      border: 3px solid #667eea;
      border-radius: 12px;
      background: white;
      color: #1a1a1a;
      transition: all 0.2s;
    }

    .score-field:focus {
      outline: none;
      border-color: #5568d3;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .score-field:disabled {
      background: #f5f5f5;
      border-color: #ddd;
      color: #999;
      cursor: not-allowed;
    }

    .score-field::placeholder {
      color: #ccc;
    }

    /* Remove number input arrows */
    .score-field::-webkit-inner-spin-button,
    .score-field::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    .score-field {
      -moz-appearance: textfield;
    }

    .vs-separator {
      font-size: 1.5rem;
      font-weight: 700;
      color: #667eea;
      text-align: center;
    }

    .match-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 1rem;
      border-top: 1px solid #e0e0e0;
    }

    .prediction-status {
      flex: 1;
    }

    .status-saved {
      color: #00b894;
      font-weight: 600;
    }

    .status-pending {
      color: #f39c12;
      font-weight: 600;
    }

    .status-missed {
      color: #d63031;
      font-weight: 600;
    }

    .btn-save {
      padding: 0.75rem 1.5rem;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-save:hover:not(:disabled) {
      background: #5568d3;
      transform: translateY(-2px);
    }

    .btn-save:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .warning-message, .urgency-message {
      margin-top: 1rem;
      padding: 0.75rem;
      border-radius: 6px;
      text-align: center;
      font-weight: 600;
    }

    .warning-message {
      background: #ffebee;
      color: #d32f2f;
    }

    .urgency-message {
      background: #fff3e0;
      color: #f57c00;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.8;
      }
    }

    .summary-footer {
      margin-top: 2rem;
      padding: 1.5rem;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .summary-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }

    .stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: #667eea;
    }

    .stat-label {
      font-size: 0.9rem;
      color: #666;
      text-align: center;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .predictions-container {
        padding: 1rem;
      }

      .header {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
      }

      .header-left {
        flex-direction: column;
        align-items: stretch;
      }

      .scores-grid {
        grid-template-columns: 1fr;
      }

      .match-teams {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .team {
        flex-direction: column !important;
        text-align: center;
      }

      .team-name {
        text-align: center !important;
      }

      .vs-separator {
        transform: rotate(90deg);
        margin: 0.5rem 0;
      }

      .match-footer {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
      }

      .btn-save {
        width: 100%;
      }

      .summary-stats {
        grid-template-columns: repeat(2, 1fr);
      }

      .score-field {
        width: 60px;
        height: 60px;
        font-size: 1.5rem;
      }
    }
  `]
})
export class PollPredictionsComponent implements OnInit, OnDestroy {
  @ViewChildren('matchCard') private matchCards?: QueryList<ElementRef<HTMLElement>>;

  private getBackendErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      const payload = err.error;
      if (payload && typeof payload === 'object') {
        const maybeMessage = (payload as any).message;
        if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
          return maybeMessage;
        }
        const maybeError = (payload as any).error;
        if (typeof maybeError === 'string' && maybeError.trim()) {
          return maybeError;
        }
      }

      if (typeof payload === 'string' && payload.trim()) {
        try {
          const parsed = JSON.parse(payload);
          const parsedMessage = (parsed as any)?.message;
          if (typeof parsedMessage === 'string' && parsedMessage.trim()) {
            return parsedMessage;
          }
        } catch {
          // ignore JSON parse errors
        }
        return payload;
      }

      if (typeof err.message === 'string' && err.message.trim()) {
        return err.message;
      }
    }

    return fallback;
  }

  private pollService = inject(PollService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  pollId!: number;
  poll: Poll | null = null;
  matches: MatchWithPrediction[] = [];
  loading = true;
  savingPrediction: number | null = null;

  realScoreByMatchId: Record<number, PartidoMarcadorResponse | null> = {};
  realScoreLoading: Record<number, boolean> = {};
  realScoreError: Record<number, string | null> = {};
  private realScorePollers = new Map<number, Subscription>();
  private visibleRealScoreMatches = new Set<number>();
  private matchCardsSub?: Subscription;
  private realScoreObserver?: IntersectionObserver;

  private timerSubscription?: Subscription;

  ngOnInit(): void {
    this.pollId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadPollData();
    this.startTimer();
  }

  ngAfterViewInit(): void {
    this.setupRealScoreObserver();
  }

  ngOnDestroy(): void {
    this.timerSubscription?.unsubscribe();
    this.realScorePollers.forEach(s => s.unsubscribe());
    this.realScorePollers.clear();
    this.matchCardsSub?.unsubscribe();
    this.realScoreObserver?.disconnect();
    this.visibleRealScoreMatches.clear();
  }

  loadPollData(): void {
    this.loading = true;

    this.pollService.getPollById(this.pollId).subscribe({
      next: (poll) => {
        this.poll = poll;
        this.loadMatches();
      },
      error: (err) => {
        console.error('Error loading poll:', err);
        this.loading = false;
        alert('Error al cargar la polla');
        this.goBack();
      }
    });
  }

  loadMatches(): void {
    this.pollService.getMatches(this.pollId).subscribe({
      next: (matches) => {
        this.loadPredictions(matches);
      },
      error: (err) => {
        console.error('Error loading matches:', err);
        this.loading = false;
      }
    });
  }

  loadPredictions(matches: PollMatch[]): void {
    this.pollService.getMyPredictions(this.pollId).subscribe({
      next: (predictions) => {
        this.matches = matches.map(match => {
          const prediction = predictions.find(p => p.pollaPartidoId === match.id);
          const timeRemaining = this.pollService.getTimeUntilLimit(match);
          const canPredict = this.pollService.canPredict(match);

          return {
            match,
            prediction,
            golesLocal: prediction?.golesLocalPronosticado ?? null,
            golesVisitante: prediction?.golesVisitantePronosticado ?? null,
            timeRemaining,
            canPredict
          };
        });

        // Sort: open predictions first, then by date
        this.matches.sort((a, b) => {
          if (a.canPredict && !b.canPredict) return -1;
          if (!a.canPredict && b.canPredict) return 1;
          return new Date(a.match.fechaHoraPartido).getTime() - new Date(b.match.fechaHoraPartido).getTime();
        });

        this.loading = false;

        // UX/perf: precarga los primeros 3 (above the fold), el resto se carga al entrar en viewport
        this.prefetchFirstRealScores(3);
      },
      error: (err) => {
        console.error('Error loading predictions:', err);
        this.loading = false;
      }
    });
  }

  private prefetchFirstRealScores(count: number): void {
    this.matches.slice(0, count).forEach(item => this.loadRealScore(item.match.id, true));
  }

  private setupRealScoreObserver(): void {
    if (typeof window === 'undefined') return;

    // Fallback si el navegador no soporta IntersectionObserver
    if (!(window as any).IntersectionObserver) {
      return;
    }

    this.realScoreObserver?.disconnect();
    this.realScoreObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const raw = el.dataset['matchId'];
          const matchId = raw ? Number(raw) : NaN;
          if (!Number.isFinite(matchId)) continue;

          if (entry.isIntersecting) {
            this.visibleRealScoreMatches.add(matchId);
            this.loadRealScore(matchId, true);
          } else {
            this.visibleRealScoreMatches.delete(matchId);
            // Si deja de ser visible, pausar auto-refresh LIVE
            this.stopRealScorePolling(matchId);
          }
        }
      },
      { root: null, threshold: 0.15 }
    );

    const observeAll = () => {
      const elements = this.matchCards?.toArray() ?? [];
      for (const ref of elements) {
        this.realScoreObserver?.observe(ref.nativeElement);
      }
    };

    this.matchCardsSub?.unsubscribe();
    this.matchCardsSub = this.matchCards?.changes.subscribe(() => {
      this.realScoreObserver?.disconnect();
      observeAll();
    });

    observeAll();
  }

  getRealScore(matchId: number): PartidoMarcadorResponse | null {
    return this.realScoreByMatchId[matchId] ?? null;
  }

  isRealScoreLoading(matchId: number): boolean {
    return !!this.realScoreLoading[matchId];
  }

  getRealScoreError(matchId: number): string | null {
    return this.realScoreError[matchId] ?? null;
  }

  loadRealScore(matchId: number, allowPolling: boolean): void {
    if (this.isRealScoreLoading(matchId)) return;
    this.realScoreLoading[matchId] = true;
    this.realScoreError[matchId] = null;

    this.pollService
      .getMatchRealScore(this.pollId, matchId)
      .pipe(finalize(() => (this.realScoreLoading[matchId] = false)))
      .subscribe({
        next: (resp) => {
          this.realScoreByMatchId[matchId] = resp;

          // Auto-refresh solo para partidos en vivo, y solo si el card está visible
          const canPoll = this.visibleRealScoreMatches.has(matchId);
          if (allowPolling && canPoll && this.shouldPollRealScore(resp)) {
            this.startRealScorePolling(matchId);
          }

          if (!canPoll || !this.shouldPollRealScore(resp)) {
            this.stopRealScorePolling(matchId);
          }
        },
        error: (err: HttpErrorResponse) => {
          console.error('Error loading real score:', err);
          this.realScoreError[matchId] = 'error';
        }
      });
  }

  private startRealScorePolling(matchId: number): void {
    if (this.realScorePollers.has(matchId)) return;
    const sub = interval(10000).subscribe(() => {
      this.loadRealScore(matchId, false);
    });
    this.realScorePollers.set(matchId, sub);
  }

  private stopRealScorePolling(matchId: number): void {
    const sub = this.realScorePollers.get(matchId);
    if (sub) sub.unsubscribe();
    this.realScorePollers.delete(matchId);
  }

  private shouldPollRealScore(resp: PartidoMarcadorResponse): boolean {
    return !resp.partidoFinalizado && this.isLiveStatus(resp.apiStatusShort);
  }

  isLiveStatus(apiStatusShort?: string | null): boolean {
    const s = (apiStatusShort ?? '').trim().toUpperCase();
    return new Set(['LIVE', '1H', '2H', 'HT', 'ET', 'BT', 'P', 'L']).has(s);
  }

  startTimer(): void {
    // Update countdown every minute
    this.timerSubscription = interval(60000).subscribe(() => {
      this.updateTimeRemaining();
    });
  }

  updateTimeRemaining(): void {
    this.matches.forEach(item => {
      item.timeRemaining = this.pollService.getTimeUntilLimit(item.match);
      item.canPredict = this.pollService.canPredict(item.match);
    });
  }

  onPredictionChange(item: MatchWithPrediction): void {
    // Validate input
    if (item.golesLocal !== null && item.golesLocal < 0) {
      item.golesLocal = 0;
    }
    if (item.golesVisitante !== null && item.golesVisitante < 0) {
      item.golesVisitante = 0;
    }
  }

  canSavePrediction(item: MatchWithPrediction): boolean {
    return item.golesLocal !== null && 
           item.golesVisitante !== null && 
           item.canPredict;
  }

  savePrediction(item: MatchWithPrediction): void {
    if (!this.canSavePrediction(item)) return;

    this.savingPrediction = item.match.id;

    const predictionRequest: CreatePredictionRequest = {
      pollaPartidoId: item.match.id,
      golesLocalPronosticado: item.golesLocal!,
      golesVisitantePronosticado: item.golesVisitante!
    };

    this.pollService.createOrUpdatePrediction(this.pollId, predictionRequest).subscribe({
      next: (prediction) => {
        item.prediction = prediction;
        this.savingPrediction = null;
        
        // Show success feedback
        const card = document.querySelector(`[data-match-id="${item.match.id}"]`);
        if (card) {
          card.classList.add('save-success');
          setTimeout(() => card.classList.remove('save-success'), 1000);
        }
      },
      error: (err) => {
        console.error('Error saving prediction:', err);
        this.savingPrediction = null;
        const msg = this.getBackendErrorMessage(err, 'Error al guardar el pronóstico. Por favor intenta de nuevo.');
        alert(msg);
      }
    });
  }

  formatDate(dateValue: string | Date): string {
    const date = typeof dateValue === 'string' ? new Date(dateValue as any) : dateValue;
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    }) + ' ' + date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  }

  getStatusLabel(estado?: string): string {
    if (!estado) return '';
    const labels: Record<string, string> = {
      'CREADA': 'Creada',
      'ABIERTA': 'Abierta',
      'CERRADA': 'Cerrada',
      'FINALIZADA': 'Finalizada'
    };
    return labels[estado] || estado;
  }

  getTotalMatches(): number {
    return this.matches.length;
  }

  getPredictedMatches(): number {
    return this.matches.filter(m => m.prediction).length;
  }

  getPendingMatches(): number {
    return this.matches.filter(m => !m.prediction && m.canPredict).length;
  }

  getMissedMatches(): number {
    return this.matches.filter(m => !m.prediction && !m.canPredict).length;
  }

  goBack(): void {
    this.router.navigate(['/polls']);
  }
}
