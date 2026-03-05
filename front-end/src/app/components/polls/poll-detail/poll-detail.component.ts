import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { PollService } from '../../../services/poll.service';
import { AuthService } from '../../../services/auth.service';
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

          <div *ngIf="ranking.length > 0" class="ranking-accordion">
            <div 
              *ngFor="let entry of ranking" 
              class="ranking-card"
              [class.podium-1]="entry.position === 1"
              [class.podium-2]="entry.position === 2"
              [class.podium-3]="entry.position === 3"
              [class.current-user]="isCurrentUser(entry.emailParticipante)"
              [class.expanded]="isExpanded(entry.emailParticipante)">

              <!-- Fila resumen (siempre visible) -->
              <div class="ranking-summary" (click)="toggleParticipant(entry.emailParticipante)">
                <div class="ranking-summary-left">
                  <span class="position-badge">
                    <span *ngIf="entry.position === 1">🥇</span>
                    <span *ngIf="entry.position === 2">🥈</span>
                    <span *ngIf="entry.position === 3">🥉</span>
                    <span *ngIf="entry.position > 3">{{ entry.position }}</span>
                  </span>
                  <div class="participant-avatar">
                    {{ getInitials(entry.emailParticipante) }}
                  </div>
                  <div class="participant-details">
                    <span class="participant-email">{{ entry.emailParticipante }}</span>
                    <span class="you-badge" *ngIf="isCurrentUser(entry.emailParticipante)">TÚ</span>
                  </div>
                </div>
                <div class="ranking-summary-right">
                  <span class="accuracy-badge" [class]="getAccuracyClass(entry)">{{ getAccuracyPercentage(entry) }}%</span>
                  <span class="points-value">{{ entry.puntosTotales }} <span class="pts-label">pts</span></span>
                  <span class="expand-chevron" [class.open]="isExpanded(entry.emailParticipante)">▼</span>
                </div>
              </div>

              <!-- Detalle de partidos (visible al hacer clic) -->
              <div class="ranking-detail" *ngIf="isExpanded(entry.emailParticipante)">
                <div class="detail-stats-row">
                  <span class="detail-stat-item">✅ Aciertos: <strong>{{ entry.pronosticosAcertados }}</strong></span>
                  <span class="detail-stat-item">🎯 Exactos: <strong>{{ entry.resultadosExactos }}</strong></span>
                  <span class="detail-stat-item">📈 Acierto: <strong [class]="getAccuracyClass(entry)">{{ getAccuracyPercentage(entry) }}%</strong></span>
                </div>
                <div class="detail-matches-list" *ngIf="matchesWithDetails.length > 0">
                  <div class="detail-matches-header">
                    <span>Partido</span>
                    <span>Resultado</span>
                    <span>Pronóstico</span>
                  </div>
                  <div *ngFor="let item of matchesWithDetails" class="detail-match-row">
                    <div class="detail-match-name">
                      {{ item.match.equipoLocal }} vs {{ item.match.equipoVisitante }}
                    </div>
                    <div class="detail-result">
                      <span *ngIf="item.hasResult" class="score-chip real-score">{{ item.match.golesLocal }} - {{ item.match.golesVisitante }}</span>
                      <span *ngIf="!item.hasResult" class="score-chip pending-score">Pendiente</span>
                    </div>
                    <div class="detail-prediction">
                      <ng-container *ngIf="getPredictionForUser(item, entry.emailParticipante) as pred">
                        <span class="score-chip pred-score">{{ pred.golesLocalPronosticado }} - {{ pred.golesVisitantePronosticado }}</span>
                      </ng-container>
                      <span *ngIf="!getPredictionForUser(item, entry.emailParticipante)" class="score-chip no-pred-score">—</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Matches Tab -->
        <div *ngIf="activeTab === 'matches'" class="tab-content">
          <div *ngIf="matchesWithDetails.length === 0" class="empty-state">
            <p>No hay partidos en esta polla</p>
          </div>

          <div class="matches-list">
            <div *ngFor="let item of matchesWithDetails" class="match-detail-card">

              <!-- Cabecera: fecha + estado -->
              <div class="mdc-header">
                <span class="mdc-date">📅 {{ formatDate(item.match.fechaHoraPartido) }}</span>
                <span *ngIf="!item.hasResult" class="pending-badge">⏳ Pendiente</span>
                <span *ngIf="item.hasResult" class="completed-badge">✅ Finalizado</span>
              </div>

              <!-- Marcador central -->
              <div class="mdc-scoreboard">
                <div class="mdc-team mdc-team--local">
                  <div class="mdc-team-avatar">{{ getInitials(item.match.equipoLocal) }}</div>
                  <span class="mdc-team-name">{{ item.match.equipoLocal }}</span>
                </div>

                <div class="mdc-score-box">
                  <ng-container *ngIf="item.hasResult">
                    <span class="mdc-score">{{ item.match.golesLocal }}</span>
                    <span class="mdc-score-sep">:</span>
                    <span class="mdc-score">{{ item.match.golesVisitante }}</span>
                  </ng-container>
                  <ng-container *ngIf="!item.hasResult">
                    <span class="mdc-score-pending">vs</span>
                  </ng-container>
                </div>

                <div class="mdc-team mdc-team--visitor">
                  <div class="mdc-team-avatar">{{ getInitials(item.match.equipoVisitante) }}</div>
                  <span class="mdc-team-name">{{ item.match.equipoVisitante }}</span>
                </div>
              </div>

              <!-- Pronósticos -->
              <div class="mdc-predictions" *ngIf="item.allPredictions.length > 0">
                <p class="mdc-predictions-label">Pronósticos</p>
                <div class="mdc-chips">
                  <div *ngFor="let pred of item.allPredictions"
                       class="mdc-chip"
                       [class.mdc-chip--me]="isCurrentUser(pred.emailParticipante)">
                    <div class="mdc-chip-avatar">{{ getInitials(pred.emailParticipante) }}</div>
                    <div class="mdc-chip-info">
                      <span class="mdc-chip-user">
                        {{ getEmailShort(pred.emailParticipante) }}
                        <span class="you-tag" *ngIf="isCurrentUser(pred.emailParticipante)">TÚ</span>
                      </span>
                      <span class="mdc-chip-score">{{ pred.golesLocalPronosticado }} – {{ pred.golesVisitantePronosticado }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div *ngIf="item.allPredictions.length === 0" class="no-predictions">
                Sin pronósticos aún
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

    /* Ranking accordion */
    .ranking-accordion {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .ranking-card {
      border: 1px solid #e0e0e0;
      border-radius: 10px;
      overflow: hidden;
      transition: box-shadow 0.2s;
    }

    .ranking-card.podium-1 {
      border-color: #ffc107;
      background: linear-gradient(135deg, #fff9e6 0%, #fffde6 100%);
    }

    .ranking-card.podium-2 {
      border-color: #9e9e9e;
      background: linear-gradient(135deg, #f5f5f5 0%, #fafafa 100%);
    }

    .ranking-card.podium-3 {
      border-color: #ff8c00;
      background: linear-gradient(135deg, #fff0e6 0%, #fff8f0 100%);
    }

    .ranking-card.current-user {
      border-color: #667eea;
    }

    .ranking-card.expanded {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }

    .ranking-summary {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      cursor: pointer;
      user-select: none;
      transition: background 0.15s;
    }

    .ranking-summary:hover {
      background: rgba(102, 126, 234, 0.05);
    }

    .ranking-summary-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .ranking-summary-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .position-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 36px;
      font-size: 1.4rem;
      font-weight: 700;
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
      flex-shrink: 0;
    }

    .participant-details {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .participant-email {
      font-weight: 600;
      color: #1a1a1a;
      font-size: 0.95rem;
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

    .points-value {
      font-size: 1.4rem;
      font-weight: 700;
      color: #667eea;
      white-space: nowrap;
    }

    .pts-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #888;
    }

    .accuracy-badge {
      font-size: 0.85rem;
      font-weight: 700;
      padding: 0.25rem 0.6rem;
      border-radius: 20px;
      white-space: nowrap;
    }

    .accuracy-high {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .accuracy-mid {
      background: #fff8e1;
      color: #f57f17;
    }

    .accuracy-low {
      background: #fce4ec;
      color: #c62828;
    }

    .expand-chevron {
      font-size: 0.75rem;
      color: #999;
      transition: transform 0.25s;
      display: inline-block;
    }

    .expand-chevron.open {
      transform: rotate(180deg);
    }

    .ranking-detail {
      border-top: 1px solid #e8e8e8;
      padding: 1rem 1.25rem;
      background: white;
    }

    .detail-stats-row {
      display: flex;
      gap: 1.5rem;
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px dashed #e0e0e0;
    }

    .detail-stat-item {
      font-size: 0.9rem;
      color: #555;
    }

    .detail-matches-list {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .detail-matches-header {
      display: grid;
      grid-template-columns: 1fr 110px 110px;
      gap: 0.5rem;
      padding: 0.4rem 0.5rem;
      font-size: 0.78rem;
      font-weight: 700;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .detail-match-row {
      display: grid;
      grid-template-columns: 1fr 110px 110px;
      gap: 0.5rem;
      padding: 0.5rem;
      border-radius: 6px;
      background: #f8f9fa;
      align-items: center;
    }

    .detail-match-row:hover {
      background: #f0f2ff;
    }

    .detail-match-name {
      font-size: 0.88rem;
      font-weight: 600;
      color: #333;
    }

    .detail-result, .detail-prediction {
      text-align: center;
    }

    .score-chip {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 700;
    }

    .real-score {
      background: #e8f5e9;
      color: #388e3c;
    }

    .pending-score {
      background: #fff3e0;
      color: #f57c00;
      font-size: 0.75rem;
    }

    .pred-score {
      background: #e8ecff;
      color: #667eea;
    }

    .no-pred-score {
      background: #f5f5f5;
      color: #bbb;
    }

    /* Matches */
    .matches-list {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .match-detail-card {
      border: 1px solid #e8e8f0;
      border-radius: 14px;
      overflow: hidden;
      background: #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      transition: box-shadow 0.2s;
    }

    .match-detail-card:hover {
      box-shadow: 0 4px 16px rgba(102,126,234,0.12);
    }

    /* Header */
    .mdc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.6rem 1.25rem;
      background: #f7f8fc;
      border-bottom: 1px solid #eeeef5;
    }

    .mdc-date {
      font-size: 0.82rem;
      font-weight: 600;
      color: #666;
    }

    .pending-badge, .completed-badge {
      padding: 0.2rem 0.65rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .pending-badge {
      background: #fff3e0;
      color: #e65100;
    }

    .completed-badge {
      background: #e8f5e9;
      color: #2e7d32;
    }

    /* Scoreboard */
    .mdc-scoreboard {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem 1.5rem;
    }

    .mdc-team {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .mdc-team--local {
      text-align: center;
    }

    .mdc-team--visitor {
      text-align: center;
    }

    .mdc-team-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1rem;
    }

    .mdc-team-name {
      font-size: 0.95rem;
      font-weight: 700;
      color: #1a1a2e;
      text-align: center;
      line-height: 1.2;
    }

    .mdc-score-box {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      background: #1a1a2e;
      border-radius: 12px;
      padding: 0.5rem 1rem;
      min-width: 90px;
      justify-content: center;
    }

    .mdc-score {
      font-size: 2rem;
      font-weight: 800;
      color: #fff;
      line-height: 1;
      min-width: 28px;
      text-align: center;
    }

    .mdc-score-sep {
      font-size: 1.5rem;
      font-weight: 700;
      color: #667eea;
    }

    .mdc-score-pending {
      font-size: 1.1rem;
      font-weight: 700;
      color: #aaa;
      letter-spacing: 0.05em;
    }

    /* Predictions */
    .mdc-predictions {
      padding: 0 1.25rem 1.25rem;
    }

    .mdc-predictions-label {
      margin: 0 0 0.65rem;
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #999;
    }

    .mdc-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .mdc-chip {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.75rem 0.4rem 0.4rem;
      border-radius: 30px;
      background: #f4f5fb;
      border: 1.5px solid #e8e8f0;
      transition: border-color 0.15s, background 0.15s;
    }

    .mdc-chip:hover {
      border-color: #667eea;
      background: #eef0ff;
    }

    .mdc-chip--me {
      border-color: #667eea;
      background: #eef0ff;
    }

    .mdc-chip-avatar {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #667eea;
      color: #fff;
      font-size: 0.65rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .mdc-chip--me .mdc-chip-avatar {
      background: #764ba2;
    }

    .mdc-chip-info {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .mdc-chip-user {
      font-size: 0.75rem;
      color: #555;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }

    .mdc-chip-score {
      font-size: 0.9rem;
      font-weight: 800;
      color: #1a1a2e;
    }

    .you-tag {
      padding: 0.1rem 0.35rem;
      background: #667eea;
      color: white;
      font-size: 0.6rem;
      font-weight: 700;
      border-radius: 8px;
    }

    .no-predictions {
      text-align: center;
      padding: 1rem 1.25rem;
      color: #bbb;
      font-size: 0.88rem;
      font-style: italic;
    }
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

      .detail-matches-header,
      .detail-match-row {
        grid-template-columns: 1fr 90px 90px;
        font-size: 0.8rem;
      }

      .mdc-scoreboard {
        grid-template-columns: 1fr auto 1fr;
        padding: 1rem;
        gap: 0.5rem;
      }

      .mdc-team-name {
        font-size: 0.8rem;
      }

      .mdc-score {
        font-size: 1.5rem;
      }

      .mdc-score-box {
        min-width: 70px;
        padding: 0.4rem 0.6rem;
      }

      .participants-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PollDetailComponent implements OnInit {
  private pollService = inject(PollService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  pollId!: number;
  poll: Poll | null = null;
  ranking: RankingEntry[] = [];
  participants: PollParticipant[] = [];
  matchesWithDetails: MatchDetail[] = [];
  
  activeTab: 'ranking' | 'matches' | 'participants' = 'ranking';
  loading = true;
  expandedParticipants = new Set<string>();

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
    this.pollService.getRanking(this.pollId).pipe(
      catchError(err => { console.error('Error loading ranking:', err); return of([]); })
    ).subscribe(ranking => {
      this.ranking = (ranking as any[]).map((entry, index) => ({ ...entry, position: index + 1 }));
    });
  }

  loadParticipants(): void {
    this.pollService.getParticipants(this.pollId).pipe(
      catchError(err => { console.error('Error loading participants:', err); return of([]); })
    ).subscribe(participants => {
      this.participants = participants as PollParticipant[];
    });
  }

  loadMatches(): void {
    const isClosed = this.poll?.estado === 'FINALIZADA' || this.poll?.estado === 'CERRADA';

    this.pollService.getMatches(this.pollId).subscribe({
      next: (matches) => {
        if (matches.length === 0) {
          this.loading = false;
          return;
        }

        const requests = matches.map(match => {
          const predictions$ = this.pollService.getMatchPredictions(this.pollId, match.id)
            .pipe(catchError(() => of([] as PollPrediction[])));

          // Para pollas finalizadas o cerradas obtenemos el marcador real
          const score$ = isClosed
            ? this.pollService.getMatchRealScore(this.pollId, match.id)
                .pipe(catchError(() => of(null)))
            : of(null);

          return forkJoin({ predictions: predictions$, score: score$ }).pipe(
            map(({ predictions, score }) => {
              const enriched: PollMatch = { ...match };
              if (score) {
                if (score.golesLocal !== null && score.golesLocal !== undefined) {
                  enriched.golesLocal = score.golesLocal;
                }
                if (score.golesVisitante !== null && score.golesVisitante !== undefined) {
                  enriched.golesVisitante = score.golesVisitante;
                }
              }
              const hasResult =
                enriched.golesLocal !== undefined && enriched.golesLocal !== null &&
                enriched.golesVisitante !== undefined && enriched.golesVisitante !== null;

              const userEmail = this.getUserEmail();
              return {
                match: enriched,
                userPrediction: (predictions as PollPrediction[]).find(p => p.emailParticipante === userEmail),
                allPredictions: predictions as PollPrediction[],
                hasResult
              } as MatchDetail;
            })
          );
        });

        forkJoin(requests).subscribe({
          next: (details) => {
            this.matchesWithDetails = details.sort((a, b) =>
              new Date(a.match.fechaHoraPartido).getTime() - new Date(b.match.fechaHoraPartido).getTime()
            );
            this.loading = false;
          },
          error: (err) => {
            console.error('Error loading match details:', err);
            this.loading = false;
          }
        });
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

  getAccuracyPercentage(entry: RankingEntry): number {
    const finishedMatches = this.matchesWithDetails.filter(m => m.hasResult).length;
    if (finishedMatches === 0) return 0;
    return Math.round((entry.pronosticosAcertados / finishedMatches) * 100);
  }

  getAccuracyClass(entry: RankingEntry): string {
    const pct = this.getAccuracyPercentage(entry);
    if (pct >= 70) return 'accuracy-high';
    if (pct >= 40) return 'accuracy-mid';
    return 'accuracy-low';
  }

  toggleParticipant(email: string): void {
    if (this.expandedParticipants.has(email)) {
      this.expandedParticipants.delete(email);
    } else {
      this.expandedParticipants.add(email);
    }
  }

  isExpanded(email: string): boolean {
    return this.expandedParticipants.has(email);
  }

  getPredictionForUser(item: MatchDetail, email: string): PollPrediction | undefined {
    return item.allPredictions.find(p => p.emailParticipante === email);
  }

  goToPredictions(): void {
    this.router.navigate(['/polls', this.pollId, 'predictions']);
  }

  goBack(): void {
    this.router.navigate(['/polls']);
  }

  private getUserEmail(): string {
    return this.authService.getCurrentUserValue()?.email || '';
  }
}
