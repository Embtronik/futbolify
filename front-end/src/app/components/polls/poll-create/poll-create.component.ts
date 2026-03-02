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
                <label for="tipo">Tipo de Polla *</label>
                <select 
                  id="tipo"
                  formControlName="tipo"
                  class="form-control"
                  (change)="onPollTypeChange()">
                  <option value="PRIVADA">Privada (Solo grupos invitados)</option>
                  <option value="PUBLICA">Pública (Abierta a todos con pago)</option>
                </select>
                <small class="form-text">
                  <span *ngIf="pollDetailsForm.get('tipo')?.value === 'PRIVADA'">
                    Solo miembros de los grupos seleccionados pueden participar sin pagar
                  </span>
                  <span *ngIf="pollDetailsForm.get('tipo')?.value === 'PUBLICA'">
                    Cualquier usuario puede participar pagando la cuota de entrada. Los grupos son opcionales y tendrán acceso sin pago.
                  </span>
                </small>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="fechaInicio">Fecha de Creación</label>
                <input 
                  id="fechaInicio"
                  type="text"
                  [value]="formatDate(pollDetailsForm.get('fechaInicio')?.value)"
                  class="form-control form-control-readonly"
                  readonly>
                <small class="form-text">La fecha se establece automáticamente al crear la polla</small>
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
          <h3>
            Seleccionar Participantes 
            <span *ngIf="pollDetailsForm.get('tipo')?.value === 'PRIVADA'" class="required-badge">Requerido</span>
            <span *ngIf="pollDetailsForm.get('tipo')?.value === 'PUBLICA'" class="optional-badge">Opcional - Acceso Privilegiado</span>
          </h3>
          <p class="step-description" *ngIf="pollDetailsForm.get('tipo')?.value === 'PUBLICA'">
            Para pollas públicas, los grupos son opcionales. Si seleccionas grupos, sus miembros tendrán acceso sin pagar.
          </p>
          <p class="step-description" *ngIf="pollDetailsForm.get('tipo')?.value === 'PRIVADA'">
            Para pollas privadas, debes seleccionar al menos un grupo. Solo sus miembros podrán participar.
          </p>
          
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
        <div class="step-content step3" *ngIf="currentStep === 3">
          <div class="step3-header">
            <h3>⚽ Arma los partidos</h3>
            <p class="step3-subtitle">Busca equipos, sélecciona local y visitante, agrega la fecha y toca el botón. Repite para cada partido.</p>
          </div>

          <!-- Guía de pasos (paso a paso visible) -->
          <div class="builder-guide">
            <div class="guide-step" [class.guide-done]="selectedHomeTeam" [class.guide-active]="!selectedHomeTeam">
              <span class="guide-num">1</span>
              <span class="guide-label">Local</span>
              <span class="guide-check" *ngIf="selectedHomeTeam">✓</span>
            </div>
            <div class="guide-arrow">›</div>
            <div class="guide-step" [class.guide-done]="selectedAwayTeam" [class.guide-active]="selectedHomeTeam && !selectedAwayTeam">
              <span class="guide-num">2</span>
              <span class="guide-label">Visitante</span>
              <span class="guide-check" *ngIf="selectedAwayTeam">✓</span>
            </div>
            <div class="guide-arrow">›</div>
            <div class="guide-step" [class.guide-done]="matchDateTime" [class.guide-active]="selectedHomeTeam && selectedAwayTeam && !matchDateTime">
              <span class="guide-num">3</span>
              <span class="guide-label">Fecha</span>
              <span class="guide-check" *ngIf="matchDateTime">✓</span>
            </div>
            <div class="guide-arrow">›</div>
            <div class="guide-step" [class.guide-active]="canAddMatch()">
              <span class="guide-num">✚</span>
              <span class="guide-label">Agregar</span>
            </div>
          </div>

          <div class="step3-layout">

            <!-- Constructor (ocupa todo el ancho en móvil) -->
            <div class="builder-panel">

              <!-- Búsqueda -->
              <div class="builder-search">
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
                      placeholder="Ej: Real Madrid, Barcelona..."
                      class="form-control"
                      (input)="searchTeams()">
                  </div>
                </div>

                <!-- Hint inicial -->
                <div class="search-start-hint" *ngIf="searchResults.length === 0 && !teamSearchTerm">
                  <span class="hint-icon">🔍</span>
                  <span>Escribe el nombre de un equipo o filtra por liga para empezar</span>
                </div>

                <!-- Hint contextual + resultados -->
                <div class="teams-results" *ngIf="searchResults.length > 0">
                  <div class="teams-role-hint" [class.hint-away]="selectedHomeTeam && !selectedAwayTeam">
                    <span *ngIf="!selectedHomeTeam">👇 Toca un equipo para <strong>Local</strong></span>
                    <span *ngIf="selectedHomeTeam && !selectedAwayTeam">👇 Ahora toca el equipo <strong>Visitante</strong></span>
                    <span *ngIf="selectedHomeTeam && selectedAwayTeam">✅ Listo — pon la fecha y agrégalo</span>
                  </div>
                  <div class="teams-grid">
                    <div
                      *ngFor="let team of searchResults"
                      class="team-card"
                      [class.team-home]="selectedHomeTeam?.id === team.id"
                      [class.team-away]="selectedAwayTeam?.id === team.id"
                      [class.team-disabled]="selectedHomeTeam && selectedAwayTeam && selectedHomeTeam.id !== team.id && selectedAwayTeam.id !== team.id"
                      (click)="selectTeam(team)">
                      <img [src]="team.logo" [alt]="team.name" class="team-logo">
                      <span class="team-name">{{ team.name }}</span>
                      <span class="team-role-badge home-badge" *ngIf="selectedHomeTeam?.id === team.id">Local</span>
                      <span class="team-role-badge away-badge" *ngIf="selectedAwayTeam?.id === team.id">Visitante</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Preview en vivo del partido -->
              <div class="match-preview-live" *ngIf="selectedHomeTeam || selectedAwayTeam">
                <p class="preview-label">Vista previa</p>
                <div class="preview-matchup">
                  <div class="preview-team" [class.preview-empty]="!selectedHomeTeam">
                    <img [src]="selectedHomeTeam.logo" [alt]="selectedHomeTeam.name" *ngIf="selectedHomeTeam">
                    <div class="preview-placeholder" *ngIf="!selectedHomeTeam">?</div>
                    <span>{{ selectedHomeTeam?.name || 'Local' }}</span>
                    <button type="button" class="btn-clear-team" *ngIf="selectedHomeTeam" (click)="clearHomeTeam()" title="Quitar">✕</button>
                  </div>
                  <span class="preview-vs">VS</span>
                  <div class="preview-team" [class.preview-empty]="!selectedAwayTeam">
                    <img [src]="selectedAwayTeam.logo" [alt]="selectedAwayTeam.name" *ngIf="selectedAwayTeam">
                    <div class="preview-placeholder" *ngIf="!selectedAwayTeam">?</div>
                    <span>{{ selectedAwayTeam?.name || 'Visitante' }}</span>
                    <button type="button" class="btn-clear-team" *ngIf="selectedAwayTeam" (click)="clearAwayTeam()" title="Quitar">✕</button>
                  </div>
                </div>
              </div>

              <!-- Fecha: aparece sólo cuando los dos equipos están listos -->
              <div class="form-group match-date-group" *ngIf="selectedHomeTeam && selectedAwayTeam">
                <label for="matchDate">📅 Fecha y hora del partido *</label>
                <input
                  id="matchDate"
                  type="datetime-local"
                  [(ngModel)]="matchDateTime"
                  class="form-control">
              </div>

              <!-- Botón agregar (sticky en móvil) -->
              <div class="btn-add-match-wrap">
                <button
                  type="button"
                  class="btn-add-match"
                  [class.btn-ready]="canAddMatch()"
                  [disabled]="!canAddMatch()"
                  (click)="addMatch()">
                  <span class="btn-icon">➕</span>
                  Agregar partido
                </button>
              </div>

            </div>

            <!-- PANEL DERECHO: Carrito (desktop) -->
            <div class="matches-cart matches-cart-desktop">
              <div class="cart-header">
                <h4>🗒️ Partidos agregados</h4>
                <span class="cart-counter" [class.cart-has-items]="selectedMatches.length > 0">{{ selectedMatches.length }}</span>
              </div>
              <div class="cart-empty" *ngIf="selectedMatches.length === 0">
                <div class="cart-empty-icon">🏟️</div>
                <p>Aún no agregaste partidos</p>
                <small>Arma cada partido en el panel izquierdo y agrégalo aquí.</small>
              </div>
              <div class="cart-list" *ngIf="selectedMatches.length > 0">
                <div
                  *ngFor="let match of selectedMatches; let i = index"
                  class="cart-item"
                  [class.cart-item-new]="i === selectedMatches.length - 1 && showMatchAddedAnimation">
                  <div class="cart-item-num">#{{ i + 1 }}</div>
                  <div class="cart-item-body">
                    <div class="cart-teams">
                      <div class="cart-team">
                        <img [src]="match.logoLocal" [alt]="match.equipoLocal" *ngIf="match.logoLocal" class="cart-logo">
                        <span>{{ match.equipoLocal }}</span>
                      </div>
                      <span class="cart-vs">vs</span>
                      <div class="cart-team">
                        <img [src]="match.logoVisitante" [alt]="match.equipoVisitante" *ngIf="match.logoVisitante" class="cart-logo">
                        <span>{{ match.equipoVisitante }}</span>
                      </div>
                    </div>
                    <div class="cart-date">📅 {{ formatMatchDate(match.fechaHoraPartido) }}</div>
                  </div>
                  <button type="button" class="cart-remove" (click)="removeMatch(i)" title="Eliminar">✕</button>
                </div>
              </div>
              <div class="cart-footer" *ngIf="selectedMatches.length > 0">
                <span>{{ selectedMatches.length }} partido{{ selectedMatches.length !== 1 ? 's' : '' }} agregado{{ selectedMatches.length !== 1 ? 's' : '' }}</span>
                <span class="cart-add-more">¿Quieres más? Sigue agregando ›</span>
              </div>
            </div>

          </div>

          <!-- ===== MOBILE ONLY: Floating cart trigger ===== -->
          <button
            type="button"
            class="mobile-cart-fab"
            (click)="toggleCartMobile()"
            [class.fab-has-items]="selectedMatches.length > 0">
            <span class="fab-icon">🗒️</span>
            <span class="fab-label">Mis partidos</span>
            <span class="fab-badge" *ngIf="selectedMatches.length > 0">{{ selectedMatches.length }}</span>
          </button>

          <!-- ===== MOBILE ONLY: Backdrop ---> 
          <div class="mobile-cart-backdrop" *ngIf="showCartMobile" (click)="closeCartMobile()"></div>

          <!-- ===== MOBILE ONLY: Bottom sheet carrito ===== -->
          <div class="mobile-cart-sheet" [class.sheet-open]="showCartMobile">
            <div class="sheet-handle-bar" (click)="closeCartMobile()"></div>
            <div class="sheet-header">
              <h4>🗒️ Partidos en tu polla</h4>
              <button type="button" class="sheet-close" (click)="closeCartMobile()">✕</button>
            </div>
            <div class="sheet-body">
              <div class="cart-empty" *ngIf="selectedMatches.length === 0">
                <div class="cart-empty-icon">🏟️</div>
                <p>Aún no agregaste partidos</p>
                <small>Cierra esto y arma tu primer partido.</small>
              </div>
              <div class="cart-list" *ngIf="selectedMatches.length > 0">
                <div
                  *ngFor="let match of selectedMatches; let i = index"
                  class="cart-item"
                  [class.cart-item-new]="i === selectedMatches.length - 1 && showMatchAddedAnimation">
                  <div class="cart-item-num">#{{ i + 1 }}</div>
                  <div class="cart-item-body">
                    <div class="cart-teams">
                      <div class="cart-team">
                        <img [src]="match.logoLocal" [alt]="match.equipoLocal" *ngIf="match.logoLocal" class="cart-logo">
                        <span>{{ match.equipoLocal }}</span>
                      </div>
                      <span class="cart-vs">vs</span>
                      <div class="cart-team">
                        <img [src]="match.logoVisitante" [alt]="match.equipoVisitante" *ngIf="match.logoVisitante" class="cart-logo">
                        <span>{{ match.equipoVisitante }}</span>
                      </div>
                    </div>
                    <div class="cart-date">📅 {{ formatMatchDate(match.fechaHoraPartido) }}</div>
                  </div>
                  <button type="button" class="cart-remove" (click)="removeMatch(i)" title="Eliminar">✕</button>
                </div>
              </div>
            </div>
            <div class="sheet-footer" *ngIf="selectedMatches.length > 0">
              <button type="button" class="btn-sheet-close-add" (click)="closeCartMobile()">
                + Agregar otro partido
              </button>
            </div>
          </div>

          <!-- Toast confirmación -->
          <div class="match-added-toast" *ngIf="showMatchAddedAnimation">
            <span class="toast-icon">✅</span>
            <span class="toast-text">¡Partido agregado!</span>
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
                <strong>Monto de Entrada:</strong> &dollar;{{ pollDetailsForm.get('montoEntrada')?.value | number }}
              </div>
              <div class="summary-item prize-info">
                <strong>💰 Premio Total Estimado:</strong> &dollar;{{ getTotalPrize() | number }}
                <small class="prize-note">{{ selectedEmails.size }} participantes x &dollar;{{ pollDetailsForm.get('montoEntrada')?.value | number }}</small>
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
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .required-badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      background: #d63031;
      color: white;
      border-radius: 4px;
      font-weight: 600;
    }

    .optional-badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      background: #00b894;
      color: white;
      border-radius: 4px;
      font-weight: 600;
    }

    .step-description {
      margin: -1rem 0 1.5rem 0;
      color: #666;
      font-size: 0.95rem;
      padding: 0.75rem;
      background: #f8f9fa;
      border-radius: 6px;
      border-left: 3px solid #667eea;
    }

    .form-text {
      font-size: 0.85rem;
      color: #666;
      margin-top: 0.25rem;
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

    .form-control-readonly {
      background-color: #f5f5f5;
      color: #555;
      cursor: default;
      user-select: none;
    }

    .form-text {
      display: block;
      margin-top: 0.25rem;
      font-size: 0.8rem;
      color: #888;
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
    /* ============================================
       PASO 3 - Layout dos paneles
    ============================================ */

    .step3-header {
      margin-bottom: 1.5rem;
      text-align: center;
    }

    .step3-header h3 {
      margin: 0 0 0.4rem;
      color: #1e293b;
      font-size: 1.4rem;
    }

    .step3-subtitle {
      color: #64748b;
      font-size: 0.95rem;
      margin: 0;
    }

    .step3-layout {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 1.5rem;
      align-items: start;
    }

    /* --- Guía de pasos --- */
    .builder-guide {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 0.75rem 1rem;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
    }

    .guide-step {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.82rem;
      color: #94a3b8;
      transition: color 0.2s;
    }

    .guide-step.guide-active {
      color: #667eea;
      font-weight: 700;
    }

    .guide-step.guide-done {
      color: #10b981;
    }

    .guide-num {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      transition: background 0.2s, color 0.2s;
    }

    .guide-step.guide-active .guide-num {
      background: #667eea;
      color: white;
    }

    .guide-step.guide-done .guide-num {
      background: #10b981;
      color: white;
    }

    .guide-check {
      color: #10b981;
      font-weight: 700;
    }

    .guide-arrow {
      color: #cbd5e1;
      font-size: 1.1rem;
      flex-shrink: 0;
    }

    /* --- Panel constructor --- */
    .builder-panel {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .builder-search .search-options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    /* Hint inicial */
    .search-start-hint {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.85rem 1rem;
      background: #f0f9ff;
      border: 1px dashed #7dd3fc;
      border-radius: 8px;
      color: #0369a1;
      font-size: 0.9rem;
    }

    .hint-icon {
      font-size: 1.2rem;
      flex-shrink: 0;
    }

    /* Hint de rol contextual */
    .teams-role-hint {
      padding: 0.5rem 0.75rem;
      background: #fef9c3;
      border-left: 3px solid #eab308;
      border-radius: 0 6px 6px 0;
      font-size: 0.88rem;
      color: #713f12;
      margin-bottom: 0.75rem;
    }

    .teams-role-hint.hint-away {
      background: #f0fdf4;
      border-left-color: #22c55e;
      color: #14532d;
    }

    /* Resultados de equipos */
    .teams-results {
      margin-bottom: 0.5rem;
    }

    .teams-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 0.75rem;
    }

    .team-card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      padding: 0.85rem 0.6rem 0.6rem;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.18s;
      background: #fff;
      user-select: none;
    }

    .team-card:hover:not(.team-disabled) {
      border-color: #667eea;
      transform: translateY(-3px);
      box-shadow: 0 4px 12px rgba(102,126,234,0.18);
    }

    .team-card.team-home {
      border-color: #3b82f6;
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
    }

    .team-card.team-away {
      border-color: #f97316;
      background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
    }

    .team-card.team-disabled {
      opacity: 0.4;
      cursor: default;
      pointer-events: none;
    }

    .team-logo {
      width: 52px;
      height: 52px;
      object-fit: contain;
    }

    .team-name {
      text-align: center;
      font-size: 0.82rem;
      font-weight: 600;
      color: #334155;
      line-height: 1.2;
    }

    .team-role-badge {
      position: absolute;
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 20px;
      white-space: nowrap;
    }

    .home-badge {
      background: #3b82f6;
      color: white;
    }

    .away-badge {
      background: #f97316;
      color: white;
    }

    /* --- Preview en vivo --- */
    .match-preview-live {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 2px dashed #94a3b8;
      border-radius: 10px;
      padding: 1rem;
    }

    .preview-label {
      text-align: center;
      font-size: 0.78rem;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 0.75rem;
    }

    .preview-matchup {
      display: flex;
      align-items: center;
      justify-content: space-around;
      gap: 0.75rem;
    }

    .preview-team {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      flex: 1;
      position: relative;
      min-width: 0;
    }

    .preview-team img {
      width: 48px;
      height: 48px;
      object-fit: contain;
    }

    .preview-team span {
      font-size: 0.85rem;
      font-weight: 600;
      color: #1e293b;
      text-align: center;
      line-height: 1.2;
      word-break: break-word;
    }

    .preview-placeholder {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      color: #94a3b8;
    }

    .preview-team.preview-empty span {
      color: #94a3b8;
      font-style: italic;
      font-weight: 400;
    }

    .btn-clear-team {
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      font-size: 0.75rem;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      top: -6px;
      right: calc(50% - 34px);
    }

    .preview-vs {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-weight: 800;
      font-size: 0.85rem;
      padding: 0.4rem 0.75rem;
      border-radius: 20px;
      flex-shrink: 0;
    }

    /* --- Fecha del partido --- */
    .match-date-group {
      animation: fadeInDown 0.25s ease-out;
    }

    @keyframes fadeInDown {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* --- Botón agregar --- */
    .btn-add-match {
      width: 100%;
      padding: 0.85rem;
      background: #94a3b8;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 700;
      font-size: 1rem;
      cursor: not-allowed;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .btn-add-match.btn-ready {
      background: linear-gradient(135deg, #00b894 0%, #00957a 100%);
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0,184,148,0.35);
      animation: pulse-green 2s infinite;
    }

    .btn-add-match.btn-ready:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,184,148,0.45);
    }

    @keyframes pulse-green {
      0%, 100% { box-shadow: 0 4px 14px rgba(0,184,148,0.35); }
      50%       { box-shadow: 0 4px 22px rgba(0,184,148,0.6); }
    }

    .btn-icon { font-size: 1.1rem; }

    /* Wrapper del bot\u00f3n agregar: normal en desktop, sticky en m\u00f3vil */
    .btn-add-match-wrap {
      display: block;
    }

    /* ============================================
       CARRITO DE PARTIDOS (panel derecho)
    ============================================ */
    .matches-cart {
      background: #fff;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      position: sticky;
      top: 1rem;
      max-height: calc(100vh - 140px);
      display: flex;
      flex-direction: column;
    }

    .cart-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      color: white;
    }

    .cart-header h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
    }

    .cart-counter {
      background: #475569;
      color: #94a3b8;
      font-weight: 700;
      font-size: 0.9rem;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
    }

    .cart-counter.cart-has-items {
      background: #00b894;
      color: white;
    }

    .cart-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 1.5rem;
      text-align: center;
      flex: 1;
    }

    .cart-empty-icon {
      font-size: 2.5rem;
      margin-bottom: 0.75rem;
      opacity: 0.5;
    }

    .cart-empty p {
      margin: 0 0 0.25rem;
      font-weight: 600;
      color: #475569;
      font-size: 0.95rem;
    }

    .cart-empty small {
      color: #94a3b8;
      font-size: 0.82rem;
    }

    .cart-list {
      flex: 1;
      overflow-y: auto;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .cart-item {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.65rem 0.75rem;
      transition: all 0.2s;
    }

    .cart-item-new {
      animation: cartItemIn 0.4s ease-out;
      border-color: #00b894;
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
    }

    @keyframes cartItemIn {
      from { opacity: 0; transform: scale(0.92) translateX(20px); }
      to   { opacity: 1; transform: scale(1) translateX(0); }
    }

    .cart-item-num {
      background: #667eea;
      color: white;
      font-size: 0.72rem;
      font-weight: 700;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .cart-item-body {
      flex: 1;
      min-width: 0;
    }

    .cart-teams {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-bottom: 0.2rem;
      font-size: 0.83rem;
      font-weight: 600;
      color: #1e293b;
    }

    .cart-team {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      min-width: 0;
      overflow: hidden;
    }

    .cart-team span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .cart-logo {
      width: 22px;
      height: 22px;
      object-fit: contain;
      flex-shrink: 0;
    }

    .cart-vs {
      color: #94a3b8;
      font-size: 0.75rem;
      font-weight: 600;
      flex-shrink: 0;
    }

    .cart-date {
      font-size: 0.77rem;
      color: #64748b;
    }

    .cart-remove {
      background: none;
      border: 1px solid #fca5a5;
      color: #ef4444;
      border-radius: 6px;
      width: 26px;
      height: 26px;
      font-size: 0.85rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.15s;
    }

    .cart-remove:hover {
      background: #ef4444;
      color: white;
    }

    .cart-footer {
      padding: 0.75rem 1rem;
      border-top: 1px solid #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      background: #f8fafc;
    }

    .cart-footer span {
      font-size: 0.83rem;
      font-weight: 600;
      color: #334155;
    }

    .cart-add-more {
      font-size: 0.78rem !important;
      color: #667eea !important;
      font-weight: 400 !important;
    }

    /* Toast */
    .match-added-toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 0.85rem 1.25rem;
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(16,185,129,0.4);
      display: flex;
      align-items: center;
      gap: 0.6rem;
      z-index: 2000;
      animation: toastIn 0.3s ease-out, toastOut 0.3s ease-in 2.2s forwards;
    }

    @keyframes toastIn {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes toastOut {
      from { opacity: 1; transform: translateY(0); }
      to   { opacity: 0; transform: translateY(20px); }
    }

    .toast-icon { font-size: 1.3rem; }
    .toast-text { font-weight: 600; font-size: 0.95rem; }

    .match-counter-info strong {
      font-size: 1.1rem;
      color: #0f5132;
    }

    /* Badge flotante con contador de partidos */
    .floating-matches-badge {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 50px;
      padding: 0.75rem 1.5rem;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
      cursor: pointer;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      transition: all 0.3s ease;
      animation: pulse 2s infinite;
    }

    .floating-matches-badge:hover {
      transform: translateY(-4px) scale(1.05);
      box-shadow: 0 6px 25px rgba(102, 126, 234, 0.6);
    }

    .badge-content {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .badge-icon {
      font-size: 1.5rem;
    }

    .badge-count {
      font-size: 1.5rem;
      font-weight: 700;
      background: white;
      color: #667eea;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .badge-label {
      font-size: 0.75rem;
      font-weight: 600;
      opacity: 0.9;
    }

    @keyframes pulse {
      0%, 100% {
        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
      }
      50% {
        box-shadow: 0 4px 30px rgba(102, 126, 234, 0.7);
      }
    }

    /* Animación de confirmación */
    .match-added-animation {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #00b894 0%, #00a185 100%);
      color: white;
      padding: 1.5rem 2.5rem;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0, 184, 148, 0.5);
      font-size: 1.2rem;
      font-weight: 700;
      z-index: 2000;
      animation: fadeInOut 2s ease-in-out;
    }

    @keyframes fadeInOut {
      0% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.5);
      }
      20% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1.1);
      }
      80% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.8);
      }
    }

    /* Matches List */
    .matches-list {
      margin-top: 2rem;
      scroll-margin-top: 2rem;
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

    /* ============================================
       RESPONSIVE — MOBILE FIRST
    ============================================ */

    /* En desktop: panel derecho a la derecha, FAB y drawer ocultos */
    .matches-cart-desktop {
      display: flex;
      flex-direction: column;
    }

    .mobile-cart-fab,
    .mobile-cart-backdrop,
    .mobile-cart-sheet {
      display: none;
    }

    /* Ajustes en tableta */
    @media (max-width: 900px) {
      .step3-layout {
        grid-template-columns: 1fr;
      }

      .matches-cart-desktop {
        position: static;
        max-height: 400px;
      }
    }

    /* ==========================
       MÓVIL (≤ 768px)
    ========================== */
    @media (max-width: 768px) {

      /* Layout general */
      .poll-create-container {
        padding: 0.75rem;
        /* Espacio para el FAB pegado al fondo */
        padding-bottom: 90px;
      }

      /* Wizard steps: ocultar texto, solo número */
      .steps {
        gap: 0.25rem;
      }
      .step span {
        display: none;
      }
      .step-number {
        width: 30px;
        height: 30px;
        font-size: 0.9rem;
      }
      .step-divider {
        flex: 1;
        max-width: 24px;
      }

      /* Ocultar carrito de escritorio en móvil */
      .matches-cart-desktop {
        display: none !important;
      }

      /* Guía de pasos compacta */
      .builder-guide {
        padding: 0.6rem 0.75rem;
        gap: 0.3rem;
      }
      .guide-label {
        font-size: 0.75rem;
      }
      .guide-num {
        width: 20px;
        height: 20px;
        font-size: 0.7rem;
      }

      /* Búsqueda: inputs en columna */
      .builder-search .search-options {
        grid-template-columns: 1fr;
        gap: 0.6rem;
      }

      /* Tamaño de inputs — 16px evita zoom automático en iOS */
      .form-control,
      .form-control:focus {
        font-size: 16px !important;
        min-height: 48px;
        padding: 0.75rem;
      }
      select.form-control {
        min-height: 48px;
      }

      /* Tarjetas de equipos: 3 columnas, más grandes para el dedo */
      .teams-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 0.6rem;
      }
      .team-card {
        padding: 0.8rem 0.4rem 0.5rem;
        min-height: 96px;
        border-radius: 10px;
      }
      .team-logo {
        width: 44px;
        height: 44px;
      }
      .team-name {
        font-size: 0.75rem;
      }
      .team-role-badge {
        font-size: 0.65rem;
        padding: 1px 6px;
        top: -7px;
      }

      /* Preview del partido más compacta */
      .match-preview-live {
        padding: 0.75rem;
      }
      .preview-team img {
        width: 38px;
        height: 38px;
      }
      .preview-team span {
        font-size: 0.78rem;
      }

      /* Botón agregar: sticky al fondo de la pantalla */
      .btn-add-match-wrap {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 0.75rem 1rem;
        background: rgba(255,255,255,0.95);
        backdrop-filter: blur(8px);
        border-top: 1px solid #e2e8f0;
        z-index: 100;
      }
      .btn-add-match {
        min-height: 52px;
        font-size: 1rem;
        border-radius: 12px;
      }

      /* ---- FAB visible en móvil ---- */
      .mobile-cart-fab {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        position: fixed;
        top: 1rem;
        right: 1rem;
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
        color: white;
        border: none;
        border-radius: 30px;
        padding: 0.55rem 1rem 0.55rem 0.8rem;
        font-size: 0.85rem;
        font-weight: 700;
        box-shadow: 0 4px 16px rgba(0,0,0,0.28);
        cursor: pointer;
        z-index: 110;
        transition: transform 0.15s;
      }
      .mobile-cart-fab:active {
        transform: scale(0.95);
      }
      .mobile-cart-fab.fab-has-items {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }
      .fab-icon { font-size: 1rem; }
      .fab-label { font-size: 0.82rem; }
      .fab-badge {
        background: #00b894;
        color: white;
        border-radius: 50%;
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        font-weight: 800;
      }

      /* ---- Backdrop ---- */
      .mobile-cart-backdrop {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.45);
        z-index: 200;
        backdrop-filter: blur(2px);
      }

      /* ---- Bottom sheet ---- */
      .mobile-cart-sheet {
        display: flex;
        flex-direction: column;
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 72vh;
        background: white;
        border-radius: 20px 20px 0 0;
        box-shadow: 0 -8px 32px rgba(0,0,0,0.2);
        z-index: 300;
        transform: translateY(100%);
        transition: transform 0.32s cubic-bezier(0.32, 0.72, 0, 1);
      }
      .mobile-cart-sheet.sheet-open {
        transform: translateY(0);
      }

      .sheet-handle-bar {
        width: 40px;
        height: 4px;
        background: #cbd5e1;
        border-radius: 2px;
        margin: 12px auto 0;
        flex-shrink: 0;
        cursor: pointer;
      }

      .sheet-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.85rem 1.25rem;
        border-bottom: 1px solid #f1f5f9;
        flex-shrink: 0;
      }
      .sheet-header h4 {
        margin: 0;
        font-size: 1rem;
        font-weight: 700;
        color: #1e293b;
      }
      .sheet-close {
        background: #f1f5f9;
        border: none;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        font-size: 1rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #475569;
      }

      .sheet-body {
        flex: 1;
        overflow-y: auto;
        padding: 0.75rem;
        -webkit-overflow-scrolling: touch;
      }

      .sheet-footer {
        padding: 0.75rem 1rem;
        border-top: 1px solid #f1f5f9;
        flex-shrink: 0;
        padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
      }
      .btn-sheet-close-add {
        width: 100%;
        padding: 0.85rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 700;
        cursor: pointer;
      }

      /* Cart items dentro del sheet: más espaciosos */
      .sheet-body .cart-item {
        padding: 0.85rem;
        border-radius: 10px;
        gap: 0.75rem;
      }
      .sheet-body .cart-teams {
        font-size: 0.9rem;
      }
      .sheet-body .cart-logo {
        width: 28px;
        height: 28px;
      }
      .sheet-body .cart-remove {
        width: 34px;
        height: 34px;
        font-size: 1rem;
      }

      /* Toast: barra ancha en móvil */
      .match-added-toast {
        bottom: 5.5rem;
        right: 1rem;
        left: 1rem;
      }

      /* Paso 1: form en columna */
      .form-row {
        grid-template-columns: 1fr;
      }

      /* Paso 2: selección en columna */
      .selection-container {
        grid-template-columns: 1fr;
      }

      /* Footer del wizard */
      .wizard-footer {
        flex-direction: column;
        gap: 0.75rem;
        padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
      }
      .footer-right {
        width: 100%;
        flex-direction: column;
      }
      .footer-right button,
      .wizard-footer button {
        width: 100%;
        min-height: 48px;
        font-size: 1rem;
        border-radius: 10px;
      }
    }

    /* Iphones con notch */
    @supports (padding: env(safe-area-inset-bottom)) {
      @media (max-width: 768px) {
        .btn-add-match-wrap {
          padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
        }
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
  minDateTime: string = '';

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
  showMatchAddedAnimation = false;
  // Drawer del carrito en móvil
  showCartMobile = false;

  toggleCartMobile(): void {
    this.showCartMobile = !this.showCartMobile;
    if (this.showCartMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeCartMobile(): void {
    this.showCartMobile = false;
    document.body.style.overflow = '';
  }

  constructor() {
    this.pollDetailsForm = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      tipo: ['PRIVADA', Validators.required], // Tipo de polla (PRIVADA por defecto)
      fechaInicio: [''], // Se establece automáticamente al crear
      montoEntrada: ['', [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    this.loadTeams();
    this.loadLeagues();
    
    // Set default start date to now and minimum datetime
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 16);
    this.minDateTime = formattedDate;
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

  // Custom validator for future dates
  futureDateValidator(control: any): {[key: string]: any} | null {
    if (!control.value) {
      return null;
    }
    
    const selectedDate = new Date(control.value);
    const now = new Date();
    
    if (selectedDate <= now) {
      return { futureDate: true };
    }
    
    return null;
  }

  // Step Navigation
  canProceed(): boolean {
    switch (this.currentStep) {
      case 1:
        return this.pollDetailsForm.valid;
      case 2:
        const pollType = this.pollDetailsForm.get('tipo')?.value;
        // Para pollas privadas, al menos un grupo es requerido
        if (pollType === 'PRIVADA') {
          return this.selectedEmails.size > 0;
        }
        // Para pollas públicas, los grupos son opcionales
        return true;
      case 3:
        return this.selectedMatches.length > 0;
      default:
        return true;
    }
  }

  nextStep(): void {
    if (this.canProceed() && this.currentStep < 4) {
      // Cerrar el drawer móvil si está abierto
      this.closeCartMobile();
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

  // Manejar cambio de tipo de polla
  onPollTypeChange(): void {
    const pollType = this.pollDetailsForm.get('tipo')?.value;
    console.log('🔄 Tipo de polla cambiado a:', pollType);
    // No limpiamos la selección, solo cambiamos la validación
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
    
    // Mostrar animación de confirmación
    this.showMatchAddedAnimation = true;
    setTimeout(() => {
      this.showMatchAddedAnimation = false;
    }, 2500);
    
    // En móvil: abrir el drawer brevemente para mostrar que fue agregado
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      this.showCartMobile = true;
      document.body.style.overflow = 'hidden';
    } else {
      // En desktop: scroll al carrito
      setTimeout(() => {
        const element = document.querySelector('.matches-cart');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
    
    // Reset selection
    this.selectedHomeTeam = null;
    this.selectedAwayTeam = null;
    this.matchDateTime = '';
    this.searchResults = [];
    this.teamSearchTerm = '';
  }

  scrollToMatchesList(): void {
    const element = document.querySelector('.matches-list');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
    const pollType = this.pollDetailsForm.get('tipo')?.value;
    
    // Validación condicional según tipo de polla
    if (!this.pollDetailsForm.valid || this.selectedMatches.length === 0) {
      return;
    }
    
    // Para pollas privadas, al menos un grupo es requerido
    if (pollType === 'PRIVADA' && this.selectedEmails.size === 0) {
      alert('Debes seleccionar al menos un grupo para crear una polla privada.');
      return;
    }

    this.creating = true;

    // Usar la fecha/hora exacta del momento de creación
    const formattedDate = new Date().toISOString().slice(0, 19);

    const pollRequest: CreatePollRequest = {
      nombre: this.pollDetailsForm.value.nombre,
      descripcion: this.pollDetailsForm.value.descripcion || '',
      fechaInicio: formattedDate,
      montoEntrada: Number(this.pollDetailsForm.value.montoEntrada),
      tipo: pollType,
      gruposIds: this.selectedTeams.size > 0 ? Array.from(this.selectedTeams) : undefined,
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
