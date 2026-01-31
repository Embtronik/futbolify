import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PollService } from '../../../services/poll.service';
import { TeamService } from '../../../services/team.service';
import { FootballApiService } from '../../../services/football-api.service';
import { CreatePollRequest, AddPollMatchRequest, Team, TeamMember, FootballTeam, FootballLeague } from '../../../models/football.model';

interface SelectedMatch {
  equipoLocal: string;
  equipoVisitante: string;
  fechaHoraPartido: string;
  logoLocal?: string;
  logoVisitante?: string;
}

@Component({
  selector: 'app-poll-create',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="poll-create-container">
      <div class="wizard-header">
        <h2>Crear Nueva Polla</h2>
        <div class="steps">
          <div class="step" [class.active]="currentStep === 1" [class.completed]="currentStep > 1">
            <div class="step-number">1</div>
            <span>Detalles</span>
          </div>
          <div class="step-divider"></div>
          <div class="step" [class.active]="currentStep === 2" [class.completed]="currentStep > 2">
            <div class="step-number">2</div>
            <span>Grupos</span>
          </div>
          <div class="step-divider"></div>
          <div class="step" [class.active]="currentStep === 3" [class.completed]="currentStep > 3">
            <div class="step-number">3</div>
            <span>Partidos</span>
          </div>
          <div class="step-divider"></div>
          <div class="step" [class.active]="currentStep === 4" [class.completed]="currentStep > 4">
            <div class="step-number">4</div>
            <span>Confirmar</span>
          </div>
        </div>
      </div>

      <div class="wizard-content">
        <!-- Paso 1: Detalles de la Polla -->
        <div class="step-content" *ngIf="currentStep === 1">
          <h3>Detalles de la Polla</h3>
          <form [formGroup]="pollDetailsForm" class="form-section">
            <div class="form-group">
              <label for="nombre">Nombre de la Polla *</label>
              <input 
                id="nombre"
                type="text" 
                formControlName="nombre"
                placeholder="Ej: Mundial 2026 - Amigos"
                class="form-control">
              <span class="error" *ngIf="pollDetailsForm.get('nombre')?.invalid && pollDetailsForm.get('nombre')?.touched">
                El nombre es requerido
              </span>
            </div>

            <div class="form-group">
              <label for="descripcion">Descripción</label>
              <textarea 
                id="descripcion"
                formControlName="descripcion"
                placeholder="Describe tu polla..."
                rows="4"
                class="form-control"></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="fechaInicio">Fecha de Inicio *</label>
                <input 
                  id="fechaInicio"
                  type="datetime-local" 
                  formControlName="fechaInicio"
                  class="form-control">
                <span class="error" *ngIf="pollDetailsForm.get('fechaInicio')?.invalid && pollDetailsForm.get('fechaInicio')?.touched">
                  La fecha es requerida
                </span>
              </div>

              <div class="form-group">
                <label for="montoEntrada">Monto de Entrada ($) *</label>
                <input 
                  id="montoEntrada"
                  type="number" 
                  formControlName="montoEntrada"
                  placeholder="0"
                  min="0"
                  step="1000"
                  class="form-control">
                <span class="error" *ngIf="pollDetailsForm.get('montoEntrada')?.invalid && pollDetailsForm.get('montoEntrada')?.touched">
                  El monto es requerido
                </span>
              </div>
            </div>
          </form>
        </div>

        <!-- Paso 2: Seleccionar Grupos y Miembros -->
        <div class="step-content" *ngIf="currentStep === 2">
          <h3>Seleccionar Participantes</h3>
          
          <div class="selection-container">
            <!-- Selección de Grupos -->
            <div class="selection-section">
              <h4>Mis Grupos de Fútbol</h4>
              <div class="search-box">
                <input 
                  type="text" 
                  [(ngModel)]="groupSearchTerm"
                  placeholder="Buscar grupo..."
                  class="form-control">
              </div>
              <div class="items-list">
                <div 
                  *ngFor="let team of filteredTeams" 
                  class="item-card"
                  [class.selected]="isTeamSelected(team.id)"
                  (click)="toggleTeam(team)">
                  <div class="item-info">
                    <img [src]="team.logoUrl" [alt]="team.name" class="item-logo" *ngIf="team.logoUrl">
                    <div>
                      <h5>{{ team.name }}</h5>
                      <p>{{ team.members?.length || 0 }} miembros</p>
                    </div>
                  </div>
                  <div class="checkbox">
                    <input type="checkbox" [checked]="isTeamSelected(team.id)" readonly>
                  </div>
                </div>
              </div>
            </div>

            <!-- Selección de Miembros Individuales -->
            <div class="selection-section">
              <h4>Miembros Seleccionados</h4>
              <div class="search-box">
                <input 
                  type="text" 
                  [(ngModel)]="memberSearchTerm"
                  placeholder="Buscar miembro..."
                  class="form-control">
              </div>
              <div class="items-list">
                <div 
                  *ngFor="let member of filteredMembers" 
                  class="item-card"
                  [class.selected]="isMemberSelected(member.userEmail)"
                  (click)="toggleMember(member)">
                  <div class="item-info">
                    <div class="member-avatar">
                      {{ getInitials(member.userInfo?.firstName, member.userInfo?.lastName) }}
                    </div>
                    <div>
                      <h5>{{ member.userInfo?.firstName }} {{ member.userInfo?.lastName }}</h5>
                      <p>{{ member.userEmail }}</p>
                    </div>
                  </div>
                  <div class="checkbox">
                    <input type="checkbox" [checked]="isMemberSelected(member.userEmail)" readonly>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="selected-summary">
            <strong>Total de Participantes Seleccionados:</strong> {{ selectedEmails.size }}
          </div>
        </div>

        <!-- Paso 3: Agregar Partidos -->
        <div class="step-content" *ngIf="currentStep === 3">
          <h3>Agregar Partidos</h3>
          
          <!-- Búsqueda de Equipos -->
          <div class="match-search-section">
            <h4>Buscar Equipos</h4>
            
            <div class="search-options">
              <div class="form-group">
                <label>Liga</label>
                <select [(ngModel)]="selectedLeague" class="form-control" (change)="onLeagueChange()">
                  <option [value]="null">Todas las ligas</option>
                  <option *ngFor="let league of leagues" [value]="league.id">
                    {{ league.name }} - {{ league.country }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label>Buscar Equipo</label>
                <input 
                  type="text" 
                  [(ngModel)]="teamSearchTerm"
                  placeholder="Nombre del equipo..."
                  class="form-control"
                  (input)="searchTeams()">
              </div>
            </div>

            <div class="teams-results" *ngIf="searchResults.length > 0">
              <h5>Resultados</h5>
              <div class="teams-grid">
                <div 
                  *ngFor="let team of searchResults" 
                  class="team-card"
                  [class.selected]="selectedHomeTeam?.id === team.id || selectedAwayTeam?.id === team.id"
                  (click)="selectTeam(team)">
                  <img [src]="team.logo" [alt]="team.name" class="team-logo">
                  <span class="team-name">{{ team.name }}</span>
                </div>
              </div>
            </div>

            <!-- Selector de Partido -->
            <div class="match-builder">
              <h4>Crear Partido</h4>
              <div class="match-form">
                <div class="team-selector">
                  <label>Equipo Local</label>
                  <div class="selected-team" *ngIf="selectedHomeTeam">
                    <img [src]="selectedHomeTeam.logo" [alt]="selectedHomeTeam.name">
                    <span>{{ selectedHomeTeam.name }}</span>
                    <button type="button" (click)="clearHomeTeam()" class="btn-clear">×</button>
                  </div>
                  <div class="empty-team" *ngIf="!selectedHomeTeam">
                    Selecciona equipo local
                  </div>
                </div>

                <div class="vs-separator">VS</div>

                <div class="team-selector">
                  <label>Equipo Visitante</label>
                  <div class="selected-team" *ngIf="selectedAwayTeam">
                    <img [src]="selectedAwayTeam.logo" [alt]="selectedAwayTeam.name">
                    <span>{{ selectedAwayTeam.name }}</span>
                    <button type="button" (click)="clearAwayTeam()" class="btn-clear">×</button>
                  </div>
                  <div class="empty-team" *ngIf="!selectedAwayTeam">
                    Selecciona equipo visitante
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label for="matchDate">Fecha y Hora del Partido *</label>
                <input 
                  id="matchDate"
                  type="datetime-local" 
                  [(ngModel)]="matchDateTime"
                  class="form-control">
              </div>

              <button 
                type="button"
                class="btn-add-match"
                [disabled]="!canAddMatch()"
                (click)="addMatch()">
                + Agregar Partido
              </button>
            </div>
          </div>

          <!-- Lista de Partidos Agregados -->
          <div class="matches-list" *ngIf="selectedMatches.length > 0">
            <h4>Partidos Agregados ({{ selectedMatches.length }})</h4>
            <div class="matches-grid">
              <div *ngFor="let match of selectedMatches; let i = index" class="match-item">
                <div class="match-info">
                  <div class="match-teams">
                    <div class="team">
                      <img [src]="match.logoLocal" [alt]="match.equipoLocal" *ngIf="match.logoLocal">
                      <span>{{ match.equipoLocal }}</span>
                    </div>
                    <span class="vs">VS</span>
                    <div class="team">
                      <img [src]="match.logoVisitante" [alt]="match.equipoVisitante" *ngIf="match.logoVisitante">
                      <span>{{ match.equipoVisitante }}</span>
                    </div>
                  </div>
                  <div class="match-date">
                    {{ formatMatchDate(match.fechaHoraPartido) }}
                  </div>
                </div>
                <button type="button" class="btn-remove" (click)="removeMatch(i)">
                  Eliminar
                </button>
              </div>
            </div>
          </div>

          <div class="warning" *ngIf="selectedMatches.length === 0">
            Debes agregar al menos un partido para continuar
          </div>
        </div>

        <!-- Paso 4: Confirmar -->
        <div class="step-content" *ngIf="currentStep === 4">
          <h3>Confirmar Creación de Polla</h3>
          
          <div class="summary-section">
            <div class="summary-card">
              <h4>📋 Detalles de la Polla</h4>
              <div class="summary-item">
                <strong>Nombre:</strong> {{ pollDetailsForm.get('nombre')?.value }}
              </div>
              <div class="summary-item">
                <strong>Descripción:</strong> {{ pollDetailsForm.get('descripcion')?.value || 'Sin descripción' }}
              </div>
              <div class="summary-item">
                <strong>Fecha de Inicio:</strong> {{ formatDate(pollDetailsForm.get('fechaInicio')?.value) }}
              </div>
              <div class="summary-item">
                <strong>Monto de Entrada:</strong> <span>$</span><span>{{ pollDetailsForm.get('montoEntrada')?.value | number }}</span>
              </div>
              <div class="summary-item prize-info">
                <strong>💰 Premio Total Estimado:</strong> <span>$</span><span>{{ getTotalPrize() | number }}</span>
                <small class="prize-note">{{ selectedEmails.size }} participantes x <span>$</span><span>{{ pollDetailsForm.get('montoEntrada')?.value | number }}</span></small>
              </div>
            </div>

            <div class="summary-card">
              <h4>👥 Participantes ({{ selectedEmails.size }})</h4>
              <div class="participants-list">
                <div *ngFor="let email of Array.from(selectedEmails)" class="participant-item">
                  {{ email }}
                </div>
              </div>
            </div>

            <div class="summary-card">
              <h4>⚽ Partidos ({{ selectedMatches.length }})</h4>
              <div class="matches-summary">
                <div *ngFor="let match of selectedMatches" class="match-summary-item">
                  <strong>{{ match.equipoLocal }} vs {{ match.equipoVisitante }}</strong>
                  <span>{{ formatMatchDate(match.fechaHoraPartido) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="confirmation-message">
            Al confirmar, se creará la polla y se enviarán invitaciones a todos los participantes seleccionados.
          </div>
        </div>
      </div>

      <!-- Navigation Buttons -->
      <div class="wizard-footer">
        <button 
          type="button"
          class="btn-secondary" 
          (click)="cancel()"
          [disabled]="creating">
          Cancelar
        </button>
        
        <div class="footer-right">
          <button 
            type="button"
            class="btn-secondary" 
            *ngIf="currentStep > 1"
            (click)="previousStep()"
            [disabled]="creating">
            Anterior
          </button>
          
          <button 
            type="button"
            class="btn-primary" 
            *ngIf="currentStep < 4"
            (click)="nextStep()"
            [disabled]="!canProceed()">
            Siguiente
          </button>
          
          <button 
            type="button"
            class="btn-create" 
            *ngIf="currentStep === 4"
            (click)="createPoll()"
            [disabled]="creating">
            {{ creating ? 'Creando...' : 'Crear Polla' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .poll-create-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .wizard-header {
      margin-bottom: 2rem;
    }

    h2 {
      font-size: 2rem;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 1.5rem;
    }

    /* Steps */
    .steps {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }

    .step-number {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #e0e0e0;
      color: #666;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      transition: all 0.3s;
    }

    .step.active .step-number {
      background: #667eea;
      color: white;
    }

    .step.completed .step-number {
      background: #00b894;
      color: white;
    }

    .step span {
      font-size: 0.9rem;
      color: #666;
      font-weight: 600;
    }

    .step.active span {
      color: #667eea;
    }

    .step-divider {
      width: 60px;
      height: 2px;
      background: #e0e0e0;
      margin-bottom: 1.5rem;
    }

    /* Content */
    .wizard-content {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      min-height: 500px;
      margin-bottom: 1.5rem;
    }

    .step-content h3 {
      margin: 0 0 1.5rem 0;
      color: #1a1a1a;
      font-size: 1.5rem;
    }

    .step-content h4 {
      margin: 0 0 1rem 0;
      color: #444;
      font-size: 1.2rem;
    }

    .step-content h5 {
      margin: 0 0 0.5rem 0;
      color: #666;
      font-size: 1rem;
    }

    /* Form */
    .form-section {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-group label {
      font-weight: 600;
      color: #444;
    }

    .form-control {
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 1rem;
      transition: border-color 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
    }

    .error {
      color: #d63031;
      font-size: 0.85rem;
    }

    /* Selection Container */
    .selection-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .selection-section {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 1rem;
    }

    .search-box {
      margin-bottom: 1rem;
    }

    .items-list {
      max-height: 400px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .item-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .item-card:hover {
      border-color: #667eea;
      background: #f8f9ff;
    }

    .item-card.selected {
      border-color: #667eea;
      background: #e8ecff;
    }

    .item-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
    }

    .item-logo {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
    }

    .member-avatar {
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

    .item-info h5 {
      margin: 0;
      font-size: 1rem;
      color: #1a1a1a;
    }

    .item-info p {
      margin: 0;
      font-size: 0.85rem;
      color: #666;
    }

    .selected-summary {
      padding: 1rem;
      background: #e8f5e9;
      border-radius: 8px;
      text-align: center;
      color: #2e7d32;
    }

    /* Match Search */
    .match-search-section {
      margin-bottom: 2rem;
    }

    .search-options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .teams-results {
      margin-bottom: 1.5rem;
    }

    .teams-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 1rem;
    }

    .team-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .team-card:hover {
      border-color: #667eea;
      transform: translateY(-2px);
    }

    .team-card.selected {
      border-color: #667eea;
      background: #e8ecff;
    }

    .team-logo {
      width: 60px;
      height: 60px;
      object-fit: contain;
    }

    .team-name {
      text-align: center;
      font-size: 0.9rem;
      font-weight: 600;
      color: #444;
    }

    /* Match Builder */
    .match-builder {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 1.5rem;
    }

    .match-form {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 1rem;
      align-items: center;
      margin-bottom: 1rem;
    }

    .team-selector label {
      display: block;
      font-weight: 600;
      color: #444;
      margin-bottom: 0.5rem;
    }

    .selected-team, .empty-team {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      border: 2px dashed #ddd;
      border-radius: 8px;
      min-height: 80px;
    }

    .selected-team {
      border-style: solid;
      border-color: #667eea;
      background: white;
      position: relative;
    }

    .selected-team img {
      width: 40px;
      height: 40px;
      object-fit: contain;
    }

    .selected-team span {
      flex: 1;
      font-weight: 600;
    }

    .btn-clear {
      position: absolute;
      top: 0.25rem;
      right: 0.25rem;
      width: 24px;
      height: 24px;
      border: none;
      background: #d63031;
      color: white;
      border-radius: 50%;
      cursor: pointer;
      font-size: 1.2rem;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty-team {
      color: #999;
      justify-content: center;
    }

    .vs-separator {
      font-size: 1.5rem;
      font-weight: 700;
      color: #667eea;
      text-align: center;
    }

    .btn-add-match {
      width: 100%;
      padding: 0.75rem;
      background: #00b894;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-add-match:hover:not(:disabled) {
      background: #00a185;
    }

    .btn-add-match:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Matches List */
    .matches-list {
      margin-top: 2rem;
    }

    .matches-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .match-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
    }

    .match-info {
      flex: 1;
    }

    .match-teams {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }

    .match-teams .team {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .match-teams img {
      width: 30px;
      height: 30px;
      object-fit: contain;
    }

    .match-teams .vs {
      font-weight: 700;
      color: #667eea;
    }

    .match-date {
      font-size: 0.9rem;
      color: #666;
    }

    .btn-remove {
      padding: 0.5rem 1rem;
      background: #d63031;
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-remove:hover {
      background: #c0231f;
    }

    .warning {
      padding: 1rem;
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 6px;
      color: #856404;
      text-align: center;
    }

    /* Summary */
    .summary-section {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .summary-card {
      padding: 1.5rem;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .summary-card h4 {
      margin: 0 0 1rem 0;
      color: #1a1a1a;
    }

    .summary-item {
      padding: 0.5rem 0;
      border-bottom: 1px solid #ddd;
    }

    .summary-item:last-child {
      border-bottom: none;
    }

    .prize-info {
      background: #f0f9ff;
      padding: 1rem !important;
      border-radius: 8px;
      border: 2px solid #0ea5e9 !important;
      margin-top: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .prize-info strong {
      color: #0369a1;
      font-size: 1.1rem;
    }

    .prize-note {
      color: #64748b;
      font-size: 0.875rem;
      font-style: italic;
    }

    .participants-list, .matches-summary {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 200px;
      overflow-y: auto;
    }

    .participant-item, .match-summary-item {
      padding: 0.5rem;
      background: white;
      border-radius: 4px;
    }

    .match-summary-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .confirmation-message {
      padding: 1rem;
      background: #e8f5e9;
      border-radius: 8px;
      color: #2e7d32;
      text-align: center;
      margin-top: 1.5rem;
    }

    /* Footer */
    .wizard-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .footer-right {
      display: flex;
      gap: 1rem;
    }

    .btn-primary, .btn-secondary, .btn-create {
      padding: 0.75rem 2rem;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #5568d3;
    }

    .btn-secondary {
      background: #e0e0e0;
      color: #444;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #d0d0d0;
    }

    .btn-create {
      background: linear-gradient(135deg, #00b894 0%, #00a185 100%);
      color: white;
    }

    .btn-create:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 184, 148, 0.4);
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .poll-create-container {
        padding: 1rem;
      }

      .steps {
        flex-wrap: wrap;
      }

      .step span {
        font-size: 0.75rem;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .selection-container {
        grid-template-columns: 1fr;
      }

      .search-options {
        grid-template-columns: 1fr;
      }

      .teams-grid {
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      }

      .match-form {
        grid-template-columns: 1fr;
      }

      .vs-separator {
        transform: rotate(90deg);
      }

      .wizard-footer {
        flex-direction: column;
        gap: 1rem;
      }

      .footer-right {
        width: 100%;
        flex-direction: column;
      }

      .footer-right button {
        width: 100%;
      }
    }
  `]
})
export class PollCreateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private pollService = inject(PollService);
  private teamService = inject(TeamService);
  private footballApiService = inject(FootballApiService);
  private router = inject(Router);

  Array = Array;

  currentStep = 1;
  creating = false;

  // Step 1: Poll Details
  pollDetailsForm: FormGroup;

  // Step 2: Groups and Members
  teams: Team[] = [];
  selectedTeams = new Set<number>();
  selectedEmails = new Set<string>();
  groupSearchTerm = '';
  memberSearchTerm = '';

  // Step 3: Matches
  leagues: FootballLeague[] = [];
  selectedLeague: number | null = null;
  teamSearchTerm = '';
  searchResults: FootballTeam[] = [];
  selectedHomeTeam: FootballTeam | null = null;
  selectedAwayTeam: FootballTeam | null = null;
  matchDateTime = '';
  selectedMatches: SelectedMatch[] = [];

  constructor() {
    this.pollDetailsForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      fechaInicio: ['', Validators.required],
      montoEntrada: ['', [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    this.loadTeams();
    this.loadLeagues();
    
    // Set default start date to now
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 16);
    this.pollDetailsForm.patchValue({ fechaInicio: formattedDate });
  }

  loadTeams(): void {
    this.teamService.getMyTeams().subscribe({
      next: (teams) => {
        this.teams = teams;
        // Load members for each team
        teams.forEach(team => {
          if (team.id) {
            this.teamService.getMembers(team.id).subscribe({
              next: (members) => {
                const teamIndex = this.teams.findIndex(t => t.id === team.id);
                if (teamIndex !== -1) {
                  this.teams[teamIndex].members = members;
                }
              }
            });
          }
        });
      },
      error: (err) => console.error('Error loading teams:', err)
    });
  }

  loadLeagues(): void {
    this.footballApiService.getLeagues().subscribe({
      next: (leagues) => {
        this.leagues = leagues;
      },
      error: (err) => console.error('Error loading leagues:', err)
    });
  }

  // Step Navigation
  canProceed(): boolean {
    switch (this.currentStep) {
      case 1:
        return this.pollDetailsForm.valid;
      case 2:
        return this.selectedEmails.size > 0;
      case 3:
        return this.selectedMatches.length > 0;
      default:
        return true;
    }
  }

  nextStep(): void {
    if (this.canProceed() && this.currentStep < 4) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  cancel(): void {
    if (confirm('¿Estás seguro de que deseas cancelar? Se perderán todos los cambios.')) {
      this.router.navigate(['/polls']);
    }
  }

  // Step 2: Groups and Members
  get filteredTeams(): Team[] {
    if (!this.groupSearchTerm) return this.teams;
    const term = this.groupSearchTerm.toLowerCase();
    return this.teams.filter(team => 
      team.name.toLowerCase().includes(term)
    );
  }

  get filteredMembers(): TeamMember[] {
    // Return empty if no teams selected - members will be loaded when teams are toggled
    return [];
  }

  isTeamSelected(teamId: number): boolean {
    return this.selectedTeams.has(teamId);
  }

  isMemberSelected(email: string): boolean {
    return this.selectedEmails.has(email);
  }

  toggleTeam(team: Team): void {
    if (!team.id) return;
    
    if (this.selectedTeams.has(team.id)) {
      this.selectedTeams.delete(team.id);
      // Remove all members from this team
      team.members?.forEach(member => {
        this.selectedEmails.delete(member.userEmail);
      });
    } else {
      this.selectedTeams.add(team.id);
      // Add all members from this team
      team.members?.forEach(member => {
        this.selectedEmails.add(member.userEmail);
      });
    }
  }

  toggleMember(member: TeamMember): void {
    if (this.selectedEmails.has(member.userEmail)) {
      this.selectedEmails.delete(member.userEmail);
    } else {
      this.selectedEmails.add(member.userEmail);
    }
  }

  getInitials(firstName?: string, lastName?: string): string {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || '??';
  }

  // Step 3: Matches
  onLeagueChange(): void {
    if (this.selectedLeague) {
      this.footballApiService.getTeamsByLeague(this.selectedLeague).subscribe({
        next: (teams) => {
          this.searchResults = teams;
        },
        error: (err) => console.error('Error loading teams:', err)
      });
    } else {
      this.searchResults = [];
    }
  }

  searchTeams(): void {
    if (this.teamSearchTerm.length >= 2) {
      this.footballApiService.searchTeams(this.teamSearchTerm).subscribe({
        next: (teams) => {
          this.searchResults = teams;
        },
        error: (err) => console.error('Error searching teams:', err)
      });
    } else {
      this.searchResults = [];
    }
  }

  selectTeam(team: FootballTeam): void {
    if (!this.selectedHomeTeam) {
      this.selectedHomeTeam = team;
    } else if (!this.selectedAwayTeam && team.id !== this.selectedHomeTeam.id) {
      this.selectedAwayTeam = team;
    }
  }

  clearHomeTeam(): void {
    this.selectedHomeTeam = null;
  }

  clearAwayTeam(): void {
    this.selectedAwayTeam = null;
  }

  canAddMatch(): boolean {
    return !!(this.selectedHomeTeam && this.selectedAwayTeam && this.matchDateTime);
  }

  addMatch(): void {
    if (!this.canAddMatch()) return;

    const match: SelectedMatch = {
      equipoLocal: this.selectedHomeTeam!.name,
      equipoVisitante: this.selectedAwayTeam!.name,
      fechaHoraPartido: this.matchDateTime,
      logoLocal: this.selectedHomeTeam!.logo,
      logoVisitante: this.selectedAwayTeam!.logo
    };

    this.selectedMatches.push(match);
    
    // Reset selection
    this.selectedHomeTeam = null;
    this.selectedAwayTeam = null;
    this.matchDateTime = '';
  }

  removeMatch(index: number): void {
    this.selectedMatches.splice(index, 1);
  }

  formatMatchDate(dateString: string): string {
    const date = new Date(dateString as any);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    }) + ' ' + date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  }

  // Step 4: Confirm and Create
  getTotalPrize(): number {
    const montoEntrada = this.pollDetailsForm.get('montoEntrada')?.value || 0;
    const participantes = this.selectedEmails.size;
    return montoEntrada * participantes;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  createPoll(): void {
    if (!this.pollDetailsForm.valid || this.selectedEmails.size === 0 || this.selectedMatches.length === 0) {
      return;
    }

    this.creating = true;

    // Format date properly for backend (ISO format without timezone)
    const fechaInicio = this.pollDetailsForm.value.fechaInicio;
    const formattedDate = fechaInicio.includes('T') ? fechaInicio : new Date(fechaInicio).toISOString().slice(0, 19);

    const pollRequest: CreatePollRequest = {
      nombre: this.pollDetailsForm.value.nombre,
      descripcion: this.pollDetailsForm.value.descripcion || '',
      fechaInicio: formattedDate,
      montoEntrada: Number(this.pollDetailsForm.value.montoEntrada),
      gruposIds: Array.from(this.selectedTeams),
      emailsInvitados: Array.from(this.selectedEmails)
    };

    console.log('📤 Enviando creación de polla:', JSON.stringify(pollRequest, null, 2));

    this.pollService.createPoll(pollRequest).subscribe({
      next: (poll) => {
        // Add matches to the poll
        const matchesRequests: AddPollMatchRequest[] = this.selectedMatches.map(match => ({
          pollaId: poll.id,
          equipoLocal: match.equipoLocal,
          equipoVisitante: match.equipoVisitante,
          fechaHoraPartido: match.fechaHoraPartido,
          equipoLocalLogo: match.logoLocal,
          equipoVisitanteLogo: match.logoVisitante
        }));

        this.pollService.addMatches(poll.id, matchesRequests).subscribe({
          next: () => {
            alert('¡Polla creada exitosamente!');
            this.router.navigate(['/polls', poll.id]);
          },
          error: (err) => {
            console.error('Error adding matches:', err);
            alert('La polla se creó pero hubo un error al agregar los partidos. Puedes agregarlos después.');
            this.router.navigate(['/polls', poll.id]);
          }
        });
      },
      error: (err) => {
        console.error('Error creating poll:', err);
        this.creating = false;
        alert('Error al crear la polla. Por favor intenta de nuevo.');
      }
    });
  }
}
