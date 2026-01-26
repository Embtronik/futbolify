import { Component, ElementRef, ViewChild, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TeamService } from '../../../services/team.service';
import { GoogleMapsLoaderService } from '../../../services/google-maps-loader.service';
import { AuthService } from '../../../services/auth.service';
import { Team, TeamMatch, CreateTeamMatchRequest, TeamMatchAttendance, MatchAttendanceStatus } from '../../../models/football.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-matches',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="matches-container">
      <div class="page-header">
        <h1>Gestión de Partidos</h1>
        <button 
          class="btn btn-primary"
          (click)="openCreateModal()"
          [disabled]="!selectedTeam"
        >
          <span>➕</span> Programar Partido
        </button>
      </div>
      <!-- Selección de equipo -->
      <div class="team-selector" *ngIf="teams.length > 0">
        <label>Selecciona el grupo para ver o gestionar sus partidos:</label>
        <div class="teams-chips">
          <button
            *ngFor="let team of teams"
            type="button"
            class="team-chip"
            [class.active]="selectedTeam?.id === team.id"
            (click)="selectTeam(team)"
          >
            <span class="team-name">{{ team.name }}</span>
            <span class="team-code">{{ team.joinCode }}</span>
          </button>
        </div>
      </div>
      <div *ngIf="teams.length === 0 && !loadingTeams" class="empty-state">
        <div class="empty-icon">👥</div>
        <h2>No perteneces a ningún grupo</h2>
        <p>Únete a un grupo o crea uno para ver y programar partidos.</p>
      </div>

      <!-- Lista de partidos -->
      <div *ngIf="selectedTeam && matches.length > 0" class="matches-list">
        <h2>Partidos programados para {{ selectedTeam.name }}</h2>
        <div class="matches-grid">
          <div class="match-card" *ngFor="let match of matches">
            <div class="match-header-centered">
              <div class="match-group-name">{{ selectedTeam.name }}</div>
              <div class="match-header-date">
                {{ match.matchDateTime | date:'EEEE d \\de MMMM, HH:mm' }}
              </div>
            </div>

            <p class="match-text">
              Partido en {{ match.address }}
            </p>

            <div class="match-bottom-row">
              <a
                class="match-map match-map-small"
                [href]="getGoogleMapsUrl(match)"
                target="_blank"
                rel="noopener"
              >
                <span class="map-label">Ver mapa</span>
                <img
                  [src]="getGoogleMapsStaticMapUrl(match)"
                  alt="Ubicación del partido en el mapa"
                >
              </a>

              <div class="match-actions-col">
                <button
                  type="button"
                  class="match-detail-btn"
                  (click)="openDetailModal(match)"
                >
                  Detalle asistencia
                </button>

                <button
                  *ngIf="isMatchCreator(match)"
                  type="button"
                  class="match-manage-btn"
                  (click)="goToManageMatch(match)"
                >
                  Administrar Partido
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Estado vacío de partidos -->
      <div *ngIf="selectedTeam && matches.length === 0 && !loadingMatches" class="empty-state">
        <div class="empty-icon">⚽</div>
        <h2>No tienes partidos programados para {{ selectedTeam.name }}</h2>
        <p>Organiza el primer partido seleccionando fecha, hora y ubicación.</p>
        <button class="btn btn-primary" (click)="openCreateModal()">Crear primer partido</button>
      </div>

      <!-- Loading -->
      <div *ngIf="loadingTeams || loadingMatches" class="loading-state">
        <div class="spinner"></div>
        <p>Cargando información...</p>
      </div>

      <!-- Modal para crear partido -->
      <div class="modal-overlay" *ngIf="showCreateModal" (click)="closeCreateModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Programar Partido</h2>
            <button class="close-btn" (click)="closeCreateModal()">✕</button>
          </div>

          <form [formGroup]="createForm" (ngSubmit)="createMatch()">
            <div class="form-group" *ngIf="selectedTeam">
              <label>Grupo</label>
              <div class="readonly-field">
                <span class="team-name">{{ selectedTeam.name }}</span>
              </div>
              <small class="form-hint">
                Código para unirse:
                <span class="team-code-inline">{{ selectedTeam.joinCode }}</span>
              </small>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="matchDate">Fecha del partido *</label>
                <input
                  id="matchDate"
                  type="date"
                  class="form-control"
                  formControlName="matchDate"
                >
              </div>
              <div class="form-group">
                <label for="matchTime">Hora del partido *</label>
                <input
                  id="matchTime"
                  type="time"
                  class="form-control"
                  formControlName="matchTime"
                >
              </div>
            </div>

            <div class="form-group">
              <label for="address">📍 Lugar del partido *</label>
              <input
                id="address"
                type="text"
                class="form-control"
                placeholder="Ingresa y selecciona una dirección con Google Maps"
                formControlName="address"
                #addressInput
              >
              <small class="form-hint">Selecciona una sugerencia de Google o escribe la dirección manualmente.</small>
            </div>

            <div class="form-error" *ngIf="futureDateError as error">
              {{ error }}
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-outline" (click)="closeCreateModal()">
                Cancelar
              </button>
              <button type="submit" class="btn btn-primary" [disabled]="createForm.invalid || creating">
                {{ creating ? 'Creando...' : 'Programar Partido' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal de detalle de partido (asistencia) -->
      <div class="modal-overlay" *ngIf="showDetailModal" (click)="closeDetailModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Detalle del partido</h2>
            <button class="close-btn" (click)="closeDetailModal()">✕</button>
          </div>

          <div class="detail-body" *ngIf="selectedMatchForDetail">
            <div class="detail-info">
              <p class="match-date">
                {{ selectedMatchForDetail.matchDateTime | date:'EEEE d \\de MMMM, HH:mm' }}
              </p>
              <p class="match-address">
                {{ selectedMatchForDetail.address }}
              </p>
            </div>

            <div class="detail-actions">
              <button
                type="button"
                class="btn yes"
                (click)="confirmAttendanceFromModal(true)"
                [disabled]="savingAttendance"
              >
                Sí asistiré
              </button>
              <button
                type="button"
                class="btn no"
                (click)="confirmAttendanceFromModal(false)"
                [disabled]="savingAttendance"
              >
                No asistiré
              </button>
            </div>

            <h3>Asistencia de jugadores</h3>

            <div *ngIf="loadingAttendance" class="state">
              <div class="spinner small"></div>
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
        </div>
      </div>
    </div>
  `,
  styles: [`
    .matches-container {
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

    .team-selector {
      margin-bottom: 24px;
    }

    .team-selector label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: var(--dark-color);
      margin-bottom: 8px;
    }

    .teams-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .team-chip {
      border-radius: 999px;
      border: 1px solid var(--border-color);
      background: white;
      padding: 6px 14px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
    }

    .team-chip .team-name {
      font-weight: 600;
      color: var(--dark-color);
    }

    .team-chip .team-code {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      color: var(--primary-color);
      background: rgba(34, 197, 94, 0.08);
      padding: 2px 6px;
      border-radius: 6px;
    }

    .team-chip.active {
      border-color: var(--primary-color);
      background: rgba(34, 197, 94, 0.08);
    }

    .matches-list {
      margin-top: 24px;
    }

    .matches-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-top: 8px;
    }

    .match-card {
      background: #f9fafb;
      border-radius: 16px;
      padding: 14px 16px;
      border: 1px solid rgba(148, 163, 184, 0.5);
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 320px;
    }

    .match-header-centered {
      text-align: center;
    }

    .match-group-name {
      font-weight: 700;
      font-size: 16px;
      color: var(--dark-color);
      margin-bottom: 2px;
    }

    .match-header-date {
      font-size: 14px;
      color: var(--gray-color);
    }

    .match-main {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .match-date {
      width: 70px;
      text-align: center;
      border-radius: 12px;
      background: rgba(34, 197, 94, 0.08);
      padding: 8px 4px;
    }

    .match-day {
      display: block;
      font-size: 22px;
      font-weight: 700;
      color: var(--primary-color);
    }

    .match-month {
      display: block;
      font-size: 12px;
      text-transform: uppercase;
      color: var(--gray-color);
    }

    .match-time {
      display: block;
      font-size: 13px;
      color: var(--dark-color);
      margin-top: 4px;
    }
    
    .match-info h3 {
      font-size: 16px;
      margin: 0 0 4px 0;
      color: var(--dark-color);
    }

    .match-text {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: var(--dark-color);
      line-height: 1.5;
    }

    .match-actions-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .match-map {
      display: block;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--border-color);
      position: relative;
    }

    .match-map-small {
      width: 60%;
      max-width: 180px;
    }

    .match-bottom-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .match-actions-col {
      display: flex;
      flex-direction: column;
      gap: 6px;
      align-items: flex-end;
    }

    .match-detail-btn {
      padding: 6px 14px;
      border-radius: 999px;
      border: 1px solid var(--primary-color);
      background: white;
      color: var(--primary-color);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    .match-manage-btn {
      padding: 6px 14px;
      border-radius: 999px;
      border: 1px solid var(--primary-color);
      background: white;
      color: var(--primary-color);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    .match-map img {
      display: block;
      width: 100%;
      height: auto;
    }

    .map-label {
      position: absolute;
      top: 8px;
      left: 8px;
      padding: 4px 8px;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.55);
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .btn-link {
      padding: 0;
      border: none;
      background: transparent;
      color: var(--primary-color);
      font-weight: 600;
      cursor: pointer;
      font-size: 13px;
    }
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-content {
      background: white;
      border-radius: 20px;
      max-width: 520px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .modal-header {
      padding: 24px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-header h2 {
      font-size: 22px;
      font-weight: 700;
      margin: 0;
      color: var(--dark-color);
    }

    .close-btn {
      background: transparent;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: var(--gray-color);
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: var(--light-color);
      color: var(--dark-color);
    }

    form {
      padding: 24px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: var(--dark-color);
      margin-bottom: 8px;
    }

    .form-row {
      display: flex;
      gap: 16px;
    }

    .form-row .form-group {
      flex: 1;
      margin-bottom: 0;
    }

    .form-control {
      width: 100%;
      padding: 10px 14px;
      border-radius: 12px;
      border: 2px solid var(--border-color);
      font-size: 14px;
      font-family: inherit;
      transition: border-color 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    .form-hint {
      font-size: 12px;
      color: var(--gray-color);
      margin-top: 4px;
      display: block;
    }

    .form-error {
      font-size: 13px;
      color: #ef4444;
      margin: 4px 0 12px 0;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 0 24px 24px 24px;
    }

    .readonly-field {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(34, 197, 94, 0.06);
      border: 1px solid var(--border-color);
    }

    .team-code-inline {
      font-family: 'Courier New', monospace;
      font-size: 13px;
      font-weight: 600;
      color: var(--primary-color);
      background: rgba(34, 197, 94, 0.1);
      padding: 2px 8px;
      border-radius: 6px;
    }

    .detail-body {
      padding: 20px 24px 24px 24px;
    }

    .detail-info {
      margin-bottom: 12px;
    }

    .detail-info .match-date {
      font-weight: 600;
      margin-bottom: 4px;
    }

    .detail-info .match-address {
      color: var(--gray-color);
      margin: 0;
    }

    .detail-actions {
      display: flex;
      gap: 12px;
      margin: 12px 0 16px 0;
    }

    .detail-actions .btn {
      flex: 1;
      padding: 8px 14px;
      border-radius: 999px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      color: #fff;
    }

    .detail-actions .btn.yes {
      background: var(--primary-color, #22c55e);
    }

    .detail-actions .btn.no {
      background: #ef4444;
    }

    .attendance-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }

    .attendance-table th,
    .attendance-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #e5e7eb;
      text-align: left;
      font-size: 13px;
    }

    .attendance-table th {
      font-weight: 600;
      color: var(--gray-color, #6b7280);
    }

    .attendance-table td span {
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 12px;
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

    .status-scheduled {
      background: rgba(37, 99, 235, 0.08);
      color: #1d4ed8;
    }

    .status-confirmed {
      background: rgba(34, 197, 94, 0.12);
      color: #15803d;
    }

    .status-pending-match {
      background: rgba(234, 179, 8, 0.12);
      color: #854d0e;
    }

    .status-cancelled {
      background: rgba(239, 68, 68, 0.1);
      color: #b91c1c;
    }

    .no-data {
      margin-top: 8px;
      color: var(--gray-color, #6b7280);
    }

    .state .spinner.small {
      width: 28px;
      height: 28px;
    }
  `]
})
export class MatchesComponent implements OnInit {
  private teamService = inject(TeamService);
  private fb = inject(FormBuilder);
  private googleMapsLoader = inject(GoogleMapsLoaderService);
  private authService = inject(AuthService);
  private router = inject(Router);

  @ViewChild('addressInput') addressInput!: ElementRef;

  teams: Team[] = [];
  selectedTeam: Team | null = null;
  matches: TeamMatch[] = [];

  loadingTeams = false;
  loadingMatches = false;
  creating = false;
  showCreateModal = false;

  futureDateError: string | null = null;

  readonly googleMapsApiKey = environment.googleMapsApiKey;

  // Google Places Autocomplete
  autocomplete: any;
  selectedPlace: { address: string; lat: number; lng: number; placeId: string } | null = null;

  // Detalle de partido / asistencia
  showDetailModal = false;
  selectedMatchForDetail: TeamMatch | null = null;
  attendance: TeamMatchAttendance[] = [];
  loadingAttendance = false;
  savingAttendance = false;

  createForm: FormGroup = this.fb.group({
    matchDate: ['', Validators.required],
    matchTime: ['', Validators.required],
    address: ['', Validators.required]
  });

  ngOnInit(): void {
  this.loadTeamsForMatches();
}

  isMatchCreator(match: TeamMatch): boolean {
    const user = this.authService.getCurrentUserValue();
    if (!user) {
      return false;
    }

    // Si el backend envía explícitamente el creador del partido (por ID)
    if (match.createdByUserId != null) {
      return match.createdByUserId === user.id;
    }

    // Lógica actual de negocio: el creador del grupo crea los partidos
    // y se identifica por email
    if (this.selectedTeam?.ownerEmail) {
      return this.selectedTeam.ownerEmail.toLowerCase() === user.email.toLowerCase();
    }

    // Fallback adicional por ID si está disponible
    return this.selectedTeam?.ownerUserId === user.id;
  }

  private loadTeamsForMatches(): void {
    this.loadingTeams = true;
    const ownedTeams$ = this.teamService.getAll();
    const memberships$ = this.teamService.getMyMemberships();
    ownedTeams$.subscribe({
      next: (owned) => {
        memberships$.subscribe({
          next: (memberships) => {
            const safeOwned = (owned || []).filter((t: any): t is Team => !!t && typeof t.id === 'number');
            const memberTeams = (memberships || [])
              .filter((m) => m.status === 'APPROVED')
              .map((m) => {
                const owned = safeOwned.find(t => t.id === m.teamId);
                if (owned) return owned;
                return {
                  id: m.teamId,
                  name: m.teamName || `Grupo #${m.teamId}`,
                  joinCode: '',
                  logoUrl: undefined,
                  ownerUserId: 0,
                  memberCount: undefined,
                  pendingRequestsCount: undefined,
                  description: undefined,
                  address: undefined,
                  latitude: undefined,
                  longitude: undefined,
                  placeId: undefined,
                  createdAt: '',
                  updatedAt: '',
                };
              });
            const mergedMap = new Map<number, Team>();
            for (const t of safeOwned) mergedMap.set(t.id, t);
            for (const t of memberTeams) mergedMap.set(t.id, t);
            this.teams = Array.from(mergedMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            this.loadingTeams = false;
            if (this.teams.length > 0) {
              this.selectTeam(this.teams[0]);
            }
          },
          error: (err) => {
            console.error('Error loading memberships for matches:', err);
            this.teams = [];
            this.loadingTeams = false;
          }
        });
      },
      error: (err) => {
        console.error('Error loading owned teams for matches:', err);
        this.teams = [];
        this.loadingTeams = false;
      }
    });
  }
  

  selectTeam(team: Team): void {
    if (this.selectedTeam?.id === team.id) {
      return;
    }

    this.selectedTeam = team;
    this.matches = [];
    this.loadMatchesForSelectedTeam();
  }

  private loadMatchesForSelectedTeam(): void {
    if (!this.selectedTeam) {
      return;
    }

    this.loadingMatches = true;
    this.teamService.getMatches(this.selectedTeam.id).subscribe({
      next: (matches) => {
        const safeMatches = (matches || []).filter((m: any): m is TeamMatch => !!m && typeof m.id === 'number');
        this.matches = safeMatches.sort((a, b) => a.matchDateTime.localeCompare(b.matchDateTime));
        this.loadingMatches = false;
      },
      error: (err) => {
        console.error('Error loading matches:', err);
        this.loadingMatches = false;
      }
    });
  }

  openCreateModal(): void {
    if (!this.selectedTeam) {
      return;
    }

    this.showCreateModal = true;
    this.createForm.reset();
    this.selectedPlace = null;
    this.futureDateError = null;

    setTimeout(() => {
      if (this.addressInput) {
        this.initAutocomplete(this.addressInput);
      }
    }, 200);
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.createForm.reset();
    this.selectedPlace = null;
    this.futureDateError = null;
  }

  openDetailModal(match: TeamMatch): void {
    if (!this.selectedTeam) {
      return;
    }

    this.selectedMatchForDetail = match;
    this.showDetailModal = true;
    this.loadAttendance();
  }

  goToManageMatch(match: TeamMatch): void {
    if (!this.selectedTeam) {
      return;
    }

    this.router.navigate(['/dashboard', 'matches', this.selectedTeam.id, match.id, 'manage']);
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedMatchForDetail = null;
    this.attendance = [];
    this.loadingAttendance = false;
    this.savingAttendance = false;
  }

  private initAutocomplete(inputElement: ElementRef): void {
    this.googleMapsLoader.load().then(async () => {
      if (!this.googleMapsLoader.isLoaded()) {
        console.error('Google Maps API no está disponible después de cargar');
        return;
      }

      if (!inputElement || !inputElement.nativeElement) {
        console.error('Input element no está disponible');
        return;
      }

      const maps = (window as any).google?.maps;
      if (maps?.importLibrary) {
        try {
          await maps.importLibrary('places');
        } catch (e) {
          console.warn('No se pudo cargar la librería Places via importLibrary', e);
        }
      }

      if (!maps?.places?.Autocomplete) {
        console.error('Google Places Autocomplete no está disponible. Verifica API key y permisos.');
        return;
      }

      const autocomplete = new (window as any).google.maps.places.Autocomplete(inputElement.nativeElement, {
        types: ['address'],
        fields: ['formatted_address', 'geometry', 'place_id']
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();

        if (!place.geometry) {
          const manualAddress = inputElement.nativeElement.value;
          if (manualAddress) {
            this.selectedPlace = {
              address: manualAddress,
              lat: 0,
              lng: 0,
              placeId: ''
            };
          }
          return;
        }

        this.selectedPlace = {
          address: place.formatted_address,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          placeId: place.place_id
        };

        this.createForm.patchValue({ address: place.formatted_address });
      });

      inputElement.nativeElement.addEventListener('blur', () => {
        const manualAddress = inputElement.nativeElement.value;
        if (manualAddress && (!this.selectedPlace || this.selectedPlace.address !== manualAddress)) {
          this.selectedPlace = {
            address: manualAddress,
            lat: 0,
            lng: 0,
            placeId: ''
          };
        }
      });

      this.autocomplete = autocomplete;
    }).catch(error => {
      console.error('Error al cargar Google Maps API para partidos:', error);
    });
  }

  createMatch(): void {
    if (!this.selectedTeam || this.createForm.invalid) {
      return;
    }

     this.futureDateError = null;

    const { matchDate, matchTime } = this.createForm.value;
    const addressControl = this.createForm.get('address');

    if (!matchDate || !matchTime || !addressControl) {
      return;
    }

    const isoDateTime = `${matchDate}T${matchTime}:00`;

    const selectedDateTime = new Date(isoDateTime);
    const now = new Date();

    if (isNaN(selectedDateTime.getTime()) || selectedDateTime <= now) {
      this.futureDateError = 'La fecha y hora del partido deben ser futuras.';
      return;
    }

    const place = this.selectedPlace || {
      address: addressControl.value,
      lat: 0,
      lng: 0,
      placeId: ''
    };

    const payload: CreateTeamMatchRequest = {
      address: place.address,
      latitude: place.lat,
      longitude: place.lng,
      placeId: place.placeId,
      matchDateTime: isoDateTime
    };

    this.creating = true;
    this.teamService.createMatch(this.selectedTeam.id, payload).subscribe({
      next: (match) => {
        this.creating = false;
        this.showCreateModal = false;
        this.createForm.reset();
        this.selectedPlace = null;
        this.matches = [...this.matches, match].sort((a, b) => a.matchDateTime.localeCompare(b.matchDateTime));
      },
      error: (err) => {
        console.error('Error creando partido:', err);
        this.creating = false;
      }
    });
  }

  getGoogleMapsUrl(match: TeamMatch): string {
    const address = (match.address || '').trim();

    if (address) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    }

    if (match.latitude && match.longitude) {
      return `https://www.google.com/maps/search/?api=1&query=${match.latitude},${match.longitude}`;
    }

    return 'https://www.google.com/maps';
  }

  getConfirmAttendanceUrl(match: TeamMatch): string {
    const redirect = encodeURIComponent(`/dashboard/matches?matchId=${match.id}`);
    return `/auth/login?redirect=${redirect}`;
  }

  getGoogleMapsStaticMapUrl(match: TeamMatch): string {
    const base = 'https://maps.googleapis.com/maps/api/staticmap';
    let centerParam: string;

    if (match.latitude && match.longitude) {
      centerParam = `${match.latitude},${match.longitude}`;
    } else {
      centerParam = encodeURIComponent(match.address);
    }

    const marker = `color:red%7C${centerParam}`;
    const params = [
      `center=${centerParam}`,
      'zoom=15',
      'size=400x200',
      'maptype=roadmap',
      `markers=${marker}`,
      `key=${this.googleMapsApiKey}`
    ].join('&');

    return `${base}?${params}`;
  }

  private loadAttendance(): void {
    if (!this.selectedTeam || !this.selectedMatchForDetail) {
      return;
    }

    this.loadingAttendance = true;
    this.teamService.getMatchAttendance(this.selectedTeam.id, this.selectedMatchForDetail.id).subscribe({
      next: (list) => {
        this.attendance = list || [];
        this.loadingAttendance = false;
      },
      error: () => {
        this.loadingAttendance = false;
      }
    });
  }

  confirmAttendanceFromModal(attending: boolean): void {
    if (!this.selectedTeam || !this.selectedMatchForDetail) {
      return;
    }

    this.savingAttendance = true;
    this.teamService.confirmMatchAttendance(this.selectedTeam.id, this.selectedMatchForDetail.id, attending).subscribe({
      next: () => {
        this.savingAttendance = false;
        this.loadAttendance();
      },
      error: () => {
        this.savingAttendance = false;
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
