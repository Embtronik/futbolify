import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PollService } from '../../../services/poll.service';
import { Poll, PollMatch, PollParticipant, PollPrediction } from '../../../models/football.model';

interface RankingEntry {
  emailParticipante: string;
  puntosTotales: number;
  pronosticosAcertados: number;
  resultadosExactos: number;
  position: number;
}

interface MatchDetail {
  match: PollMatch;
  userPrediction?: PollPrediction;
  allPredictions: PollPrediction[];
  hasResult: boolean;
}

@Component({
  selector: 'app-poll-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="poll-detail-container">
      <div class="header">
        <div class="header-left">
          <button class="btn-back" (click)="goBack()">
            ← Volver
          </button>
          <div>
            <h2>{{ poll?.nombre }}</h2>
            <p class="subtitle">{{ poll?.descripcion }}</p>
          </div>
        </div>
        <div class="header-right">
          <span class="badge" [class]="'badge-' + poll?.estado?.toLowerCase()">
            {{ getStatusLabel(poll?.estado) }}
          </span>
          <button class="btn-predict" (click)="goToPredictions()" *ngIf="poll?.estado === 'ABIERTA'">
            Hacer Pronósticos
          </button>
        </div>
      </div>

      <div *ngIf="loading" class="loading">
        Cargando información...
      </div>

      <div *ngIf="!loading" class="content">
        <!-- Poll Info -->
        <div class="info-section">
          <div class="info-card">
            <h3>📋 Información de la Polla</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Creador:</span>
                <span class="value">{{ poll?.creadorEmail }}</span>
              </div>
              <div class="info-item">
                <span class="label">Fecha de Inicio:</span>
                <span class="value">{{ (poll && poll.fechaInicio) ? formatDate(poll.fechaInicio) : 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="label">Monto de Entrada:</span>
                <span class="value">\${{ poll?.montoEntrada | number }}</span>
              </div>
              <div class="info-item">
                <span class="label">Participantes:</span>
                <span class="value">{{ participants.length }}</span>
              </div>
              <div class="info-item">
                <span class="label">Total Partidos:</span>
                <span class="value">{{ matchesWithDetails.length }}</span>
              </div>
              <div class="info-item">
                <span class="label">Premio Total:</span>
                <span class="value prize">\${{ getTotalPrize() | number }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button 
            class="tab" 
            [class.active]="activeTab === 'ranking'"
            (click)="activeTab = 'ranking'">
            🏆 Ranking
          </button>
          <button 
            class="tab" 
            [class.active]="activeTab === 'matches'"
            (click)="activeTab = 'matches'">
            ⚽ Partidos
          </button>
          <button 
            class="tab" 
            [class.active]="activeTab === 'participants'"
            (click)="activeTab = 'participants'">
            👥 Participantes
          </button>
        </div>

        <!-- Ranking Tab -->
        <div *ngIf="activeTab === 'ranking'" class="tab-content">
          <div class="ranking-header">
            <h3>Tabla de Posiciones</h3>
            <p class="ranking-info">
              Los puntos se calculan según: Resultado exacto = 3pts, Ganador correcto = 1pt
            </p>
          </div>

          <div *ngIf="ranking.length === 0" class="empty-state">
            <p>Aún no hay datos de ranking. Los partidos deben tener resultados para calcular los puntos.</p>
          </div>

          <div *ngIf="ranking.length > 0" class="ranking-table">
            <div class="ranking-header-row">
              <div class="col-position">#</div>
              <div class="col-participant">Participante</div>
              <div class="col-points">Puntos</div>
              <div class="col-correct">Aciertos</div>
              <div class="col-exact">Exactos</div>
            </div>

            <div 
              *ngFor="let entry of ranking; let i = index" 
              class="ranking-row"
              [class.podium-1]="entry.position === 1"
              [class.podium-2]="entry.position === 2"
              [class.podium-3]="entry.position === 3"
              [class.current-user]="isCurrentUser(entry.emailParticipante)">
              
              <div class="col-position">
                <span class="position-badge">
                  <span *ngIf="entry.position === 1">🥇</span>
                  <span *ngIf="entry.position === 2">🥈</span>
                  <span *ngIf="entry.position === 3">🥉</span>
                  <span *ngIf="entry.position > 3">{{ entry.position }}</span>
                </span>
              </div>
              
              <div class="col-participant">
                <div class="participant-info">
                  <div class="participant-avatar">
                    {{ getInitials(entry.emailParticipante) }}
                  </div>
                  <div class="participant-details">
                    <span class="participant-email">{{ entry.emailParticipante }}</span>
                    <span class="you-badge" *ngIf="isCurrentUser(entry.emailParticipante)">TÚ</span>
                  </div>
                </div>
              </div>
              
              <div class="col-points">
                <span class="points-value">{{ entry.puntosTotales }}</span>
              </div>
              
              <div class="col-correct">
                {{ entry.pronosticosAcertados }}
              </div>
              
              <div class="col-exact">
                {{ entry.resultadosExactos }}
              </div>
            </div>
          </div>
        </div>

        <!-- Matches Tab -->
        <div *ngIf="activeTab === 'matches'" class="tab-content">
          <h3>Partidos y Pronósticos</h3>

          <div *ngIf="matchesWithDetails.length === 0" class="empty-state">
            <p>No hay partidos en esta polla</p>
          </div>

          <div class="matches-list">
            <div *ngFor="let item of matchesWithDetails" class="match-detail-card">
              <div class="match-header">
                <div class="match-date">
                  {{ formatDate(item.match.fechaHoraPartido) }}
                </div>
                <div class="match-status">
                  <span *ngIf="!item.hasResult" class="pending-badge">Pendiente</span>
                  <span *ngIf="item.hasResult" class="completed-badge">Finalizado</span>
                </div>
              </div>

              <div class="match-teams-display">
                <div class="team-display">
                  <span class="team-name">{{ item.match.equipoLocal }}</span>
                  <span class="team-score" *ngIf="item.hasResult">
                    {{ item.match.golesLocal }}
                  </span>
                </div>
                <span class="vs">VS</span>
                <div class="team-display">
                  <span class="team-score" *ngIf="item.hasResult">
                    {{ item.match.golesVisitante }}
                  </span>
                  <span class="team-name">{{ item.match.equipoVisitante }}</span>
                </div>
              </div>

              <div class="predictions-summary" *ngIf="item.allPredictions.length > 0">
                <h4>Pronósticos de Participantes</h4>
                <div class="predictions-grid">
                  <div *ngFor="let pred of item.allPredictions" class="prediction-item"
                       [class.user-prediction]="isCurrentUser(pred.emailParticipante)">
                    <div class="prediction-user">
                      {{ getEmailShort(pred.emailParticipante) }}
                      <span class="you-tag" *ngIf="isCurrentUser(pred.emailParticipante)">TÚ</span>
                    </div>
                    <div class="prediction-score">
                      {{ pred.golesLocalPronosticado }} - {{ pred.golesVisitantePronosticado }}
                    </div>
                  </div>
                </div>
              </div>

              <div *ngIf="item.allPredictions.length === 0" class="no-predictions">
                Aún no hay pronósticos para este partido
              </div>
            </div>
          </div>
        </div>

        <!-- Participants Tab -->
        <div *ngIf="activeTab === 'participants'" class="tab-content">
          <h3>Participantes ({{ participants.length }})</h3>

          <div class="participants-grid">
            <div *ngFor="let participant of participants" class="participant-card"
                 [class.creator]="participant.emailUsuario === poll?.creadorEmail">
              <div class="participant-avatar-large">
                {{ getInitials(participant.emailUsuario) }}
              </div>
              <div class="participant-info-card">
                <span class="participant-email-large">{{ participant.emailUsuario }}</span>
                <div class="participant-badges">
                  <span class="badge-creator" *ngIf="participant.emailUsuario === poll?.creadorEmail">
                    👑 Creador
                  </span>
                  <span class="badge-status" [class]="'badge-' + participant.estado.toLowerCase()">
                    {{ getParticipantStatus(participant.estado) }}
                  </span>
                </div>
                <div class="participant-stats" *ngIf="participant.estado === 'ACEPTADO'">
                  <span>Puntos: {{ getParticipantPoints(participant.emailUsuario) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .poll-detail-container {
      max-width: 1400px;
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
      flex: 1;
    }

    .header-right {
      display: flex;
      gap: 1rem;
      align-items: center;
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
      font-size: 2rem;
      font-weight: 700;
      color: #1a1a1a;
    }

    .subtitle {
      margin: 0.25rem 0 0 0;
      color: #666;
      font-size: 0.9rem;
    }

    .badge {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      white-space: nowrap;
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

    .btn-predict {
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-predict:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .loading {
      text-align: center;
      padding: 3rem;
      color: #666;
      font-size: 1.1rem;
    }

    /* Info Section */
    .info-section {
      margin-bottom: 2rem;
    }

    .info-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .info-card h3 {
      margin: 0 0 1rem 0;
      color: #1a1a1a;
      font-size: 1.3rem;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .info-item .label {
      font-size: 0.85rem;
      color: #666;
      font-weight: 600;
    }

    .info-item .value {
      font-size: 1.1rem;
      color: #1a1a1a;
      font-weight: 700;
    }

    .info-item .prize {
      color: #00b894;
      font-size: 1.5rem;
    }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
      border-bottom: 2px solid #e0e0e0;
    }

    .tab {
      padding: 0.75rem 1.5rem;
      background: none;
      border: none;
      border-bottom: 3px solid transparent;
      font-size: 1rem;
      font-weight: 600;
      color: #666;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: -2px;
    }

    .tab.active {
      color: #667eea;
      border-bottom-color: #667eea;
    }

    .tab:hover {
      color: #667eea;
    }

    /* Tab Content */
    .tab-content {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .tab-content h3 {
      margin: 0 0 1.5rem 0;
      color: #1a1a1a;
      font-size: 1.5rem;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: #666;
    }

    /* Ranking */
    .ranking-header {
      margin-bottom: 1.5rem;
    }

    .ranking-info {
      margin: 0.5rem 0 0 0;
      color: #666;
      font-size: 0.9rem;
    }

    .ranking-table {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
    }

    .ranking-header-row {
      display: grid;
      grid-template-columns: 60px 1fr 100px 100px 100px;
      gap: 1rem;
      padding: 1rem;
      background: #f8f9fa;
      font-weight: 700;
      color: #444;
      border-bottom: 2px solid #e0e0e0;
    }

    .ranking-row {
      display: grid;
      grid-template-columns: 60px 1fr 100px 100px 100px;
      gap: 1rem;
      padding: 1rem;
      border-bottom: 1px solid #e0e0e0;
      align-items: center;
      transition: all 0.2s;
    }

    .ranking-row:last-child {
      border-bottom: none;
    }

    .ranking-row:hover {
      background: #f8f9ff;
    }

    .ranking-row.podium-1 {
      background: linear-gradient(135deg, #fff9e6 0%, #ffe5b4 100%);
    }

    .ranking-row.podium-2 {
      background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
    }

    .ranking-row.podium-3 {
      background: linear-gradient(135deg, #fff0e6 0%, #ffd4a3 100%);
    }

    .ranking-row.current-user {
      border: 2px solid #667eea;
      background: #e8ecff;
    }

    .col-position {
      text-align: center;
    }

    .position-badge {
      display: inline-block;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .participant-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .participant-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #667eea;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.9rem;
    }

    .participant-details {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .participant-email {
      font-weight: 600;
      color: #1a1a1a;
    }

    .you-badge {
      display: inline-block;
      padding: 0.15rem 0.5rem;
      background: #667eea;
      color: white;
      font-size: 0.7rem;
      font-weight: 700;
      border-radius: 10px;
    }

    .col-points {
      text-align: center;
    }

    .points-value {
      font-size: 1.3rem;
      font-weight: 700;
      color: #667eea;
    }

    .col-correct, .col-exact {
      text-align: center;
      font-weight: 600;
    }

    /* Matches */
    .matches-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .match-detail-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1.5rem;
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

    .pending-badge, .completed-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 700;
    }

    .pending-badge {
      background: #fff3e0;
      color: #f57c00;
    }

    .completed-badge {
      background: #e8f5e9;
      color: #388e3c;
    }

    .match-teams-display {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2rem;
      margin-bottom: 1.5rem;
    }

    .team-display {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .team-display .team-name {
      font-weight: 700;
      font-size: 1.2rem;
      color: #1a1a1a;
    }

    .team-display .team-score {
      font-size: 2rem;
      font-weight: 700;
      color: #667eea;
      width: 60px;
      text-align: center;
    }

    .vs {
      font-size: 1.2rem;
      font-weight: 700;
      color: #999;
    }

    .predictions-summary h4 {
      margin: 0 0 1rem 0;
      color: #444;
      font-size: 1rem;
    }

    .predictions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 0.75rem;
    }

    .prediction-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: #f8f9fa;
      border-radius: 6px;
      border: 2px solid transparent;
    }

    .prediction-item.user-prediction {
      background: #e8ecff;
      border-color: #667eea;
    }

    .prediction-user {
      font-size: 0.9rem;
      color: #444;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .you-tag {
      padding: 0.1rem 0.4rem;
      background: #667eea;
      color: white;
      font-size: 0.65rem;
      font-weight: 700;
      border-radius: 8px;
    }

    .prediction-score {
      font-weight: 700;
      color: #1a1a1a;
      font-size: 1rem;
    }

    .no-predictions {
      text-align: center;
      padding: 1.5rem;
      color: #999;
      font-style: italic;
    }

    /* Participants */
    .participants-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }

    .participant-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      transition: all 0.2s;
    }

    .participant-card:hover {
      border-color: #667eea;
      background: #f8f9ff;
    }

    .participant-card.creator {
      border-color: #ffc107;
      background: #fffbf0;
    }

    .participant-avatar-large {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #667eea;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.2rem;
    }

    .participant-info-card {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .participant-email-large {
      font-weight: 600;
      color: #1a1a1a;
      font-size: 0.95rem;
    }

    .participant-badges {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .badge-creator {
      padding: 0.25rem 0.75rem;
      background: #ffc107;
      color: #1a1a1a;
      font-size: 0.75rem;
      font-weight: 700;
      border-radius: 12px;
    }

    .badge-status {
      padding: 0.25rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 700;
      border-radius: 12px;
    }

    .badge-aceptado {
      background: #e8f5e9;
      color: #388e3c;
    }

    .badge-invitado {
      background: #fff3e0;
      color: #f57c00;
    }

    .badge-rechazado {
      background: #ffebee;
      color: #d32f2f;
    }

    .participant-stats {
      font-size: 0.9rem;
      color: #666;
      font-weight: 600;
    }

    /* Responsive */
    @media (max-width: 968px) {
      .ranking-header-row,
      .ranking-row {
        grid-template-columns: 50px 1fr 80px 80px 80px;
        gap: 0.5rem;
        font-size: 0.9rem;
      }
    }

    @media (max-width: 768px) {
      .poll-detail-container {
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

      .header-right {
        justify-content: space-between;
      }

      .info-grid {
        grid-template-columns: 1fr;
      }

      .tabs {
        flex-wrap: wrap;
      }

      .tab {
        flex: 1;
        min-width: 100px;
        font-size: 0.85rem;
      }

      .ranking-header-row {
        display: none;
      }

      .ranking-row {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }

      .ranking-row > div {
        text-align: left !important;
      }

      .match-teams-display {
        flex-direction: column;
        gap: 1rem;
      }

      .predictions-grid {
        grid-template-columns: 1fr;
      }

      .participants-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PollDetailComponent implements OnInit {
  private pollService = inject(PollService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  pollId!: number;
  poll: Poll | null = null;
  ranking: RankingEntry[] = [];
  participants: PollParticipant[] = [];
  matchesWithDetails: MatchDetail[] = [];
  
  activeTab: 'ranking' | 'matches' | 'participants' = 'ranking';
  loading = true;

  ngOnInit(): void {
    this.pollId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadPollData();
  }

  loadPollData(): void {
    this.loading = true;

    this.pollService.getPollById(this.pollId).subscribe({
      next: (poll) => {
        this.poll = poll;
        this.loadRanking();
        this.loadParticipants();
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

  loadRanking(): void {
    this.pollService.getRanking(this.pollId).subscribe({
      next: (ranking) => {
        this.ranking = ranking.map((entry, index) => ({
          ...entry,
          position: index + 1
        }));
      },
      error: (err) => {
        console.error('Error loading ranking:', err);
      }
    });
  }

  loadParticipants(): void {
    this.pollService.getParticipants(this.pollId).subscribe({
      next: (participants) => {
        this.participants = participants;
      },
      error: (err) => {
        console.error('Error loading participants:', err);
      }
    });
  }

  loadMatches(): void {
    this.pollService.getMatches(this.pollId).subscribe({
      next: (matches) => {
        // Load predictions for each match
        matches.forEach(match => {
          this.pollService.getMatchPredictions(this.pollId, match.id).subscribe({
            next: (predictions) => {
              const userEmail = this.getUserEmail();
              const userPrediction = predictions.find(p => p.emailParticipante === userEmail);
              const hasResult = match.golesLocal !== undefined && match.golesVisitante !== undefined;

              this.matchesWithDetails.push({
                match,
                userPrediction,
                allPredictions: predictions,
                hasResult
              });

              // Sort by date
              this.matchesWithDetails.sort((a, b) => 
                new Date(a.match.fechaHoraPartido).getTime() - new Date(b.match.fechaHoraPartido).getTime()
              );
            }
          });
        });

        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading matches:', err);
        this.loading = false;
      }
    });
  }

  formatDate(dateValue?: string | Date): string {
    if (!dateValue) return '';
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    return date.toLocaleDateString('es-ES', {
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

  getParticipantStatus(estado: string): string {
    const labels: Record<string, string> = {
      'INVITADO': 'Invitado',
      'ACEPTADO': 'Aceptado',
      'RECHAZADO': 'Rechazado'
    };
    return labels[estado] || estado;
  }

  getTotalPrize(): number {
    const acceptedParticipants = this.participants.filter(p => p.estado === 'ACEPTADO').length;
    return (this.poll?.montoEntrada || 0) * acceptedParticipants;
  }

  getInitials(email: string): string {
    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  }

  getEmailShort(email: string): string {
    return email.split('@')[0];
  }

  isCurrentUser(email: string): boolean {
    return email === this.getUserEmail();
  }

  getParticipantPoints(email: string): number {
    const entry = this.ranking.find(r => r.emailParticipante === email);
    return entry?.puntosTotales || 0;
  }

  goToPredictions(): void {
    this.router.navigate(['/polls', this.pollId, 'predictions']);
  }

  goBack(): void {
    this.router.navigate(['/polls']);
  }

  private getUserEmail(): string {
    // TODO: Get from auth service
    return localStorage.getItem('userEmail') || '';
  }
}
