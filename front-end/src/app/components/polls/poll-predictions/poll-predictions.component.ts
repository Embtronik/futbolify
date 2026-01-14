import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { PollService } from '../../../services/poll.service';
import { Poll, PollMatch, PollPrediction, CreatePredictionRequest } from '../../../models/football.model';

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
            class="match-card"
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

            <!-- Match Teams -->
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
      margin-bottom: 1rem;
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

  private timerSubscription?: Subscription;

  ngOnInit(): void {
    this.pollId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadPollData();
    this.startTimer();
  }

  ngOnDestroy(): void {
    this.timerSubscription?.unsubscribe();
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
      },
      error: (err) => {
        console.error('Error loading predictions:', err);
        this.loading = false;
      }
    });
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
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    return date.toLocaleString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
