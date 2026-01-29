import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TeamService } from '../../../services/team.service';
import { Team, TeamMember } from '../../../models/football.model';

@Component({
  selector: 'app-join-team',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="join-team-container">
      <div class="page-header">
        <h1>Unirse a un Equipo</h1>
      </div>

      <!-- Formulario para ingresar código -->
      <div class="join-card">
        <div class="join-icon">🔗</div>
        <h2>Ingresa el código de invitación</h2>
        <p class="join-description">
          Solicita al administrador del equipo el código de 6 caracteres para unirte.
          Tu solicitud deberá ser aprobada antes de que puedas acceder.
        </p>

        <form [formGroup]="joinForm" (ngSubmit)="submitJoinRequest()">
          <div class="code-input-container">
            <input 
              type="text" 
              formControlName="joinCode"
              placeholder="ABC123"
              maxlength="6"
              class="code-input"
              [class.error]="joinForm.get('joinCode')?.invalid && joinForm.get('joinCode')?.touched"
            >
            <button 
              type="submit" 
              class="btn btn-primary"
              [disabled]="joinForm.invalid || submitting"
            >
              <span *ngIf="!submitting">🔍 Buscar</span>
              <span *ngIf="submitting">⏳ Enviando...</span>
            </button>
          </div>
          
          <div class="error-message" *ngIf="joinForm.get('joinCode')?.invalid && joinForm.get('joinCode')?.touched">
            El código debe tener exactamente 6 caracteres alfanuméricos
          </div>

          <div class="success-message" *ngIf="successMessage">
            {{ successMessage }}
          </div>

          <div class="error-message" *ngIf="errorMessage">
            {{ errorMessage }}
          </div>
        </form>

        <div class="info-note">
          <strong>Nota:</strong> El administrador debe aprobar tu solicitud antes de que puedas acceder al grupo.
        </div>
      </div>

      <!-- Solicitudes pendientes -->
      <div class="pending-section" *ngIf="pendingMemberships.length > 0">
        <h2>Solicitudes Pendientes</h2>
        <div class="pending-list">
          <div *ngFor="let membership of pendingMemberships" class="pending-card">
            <div class="pending-info">
              <div class="pending-icon">⏳</div>
              <div>
                <h3>{{ getTeamName(membership.teamId) }}</h3>
                <p class="pending-date">Solicitado: {{ membership.requestedAt | date:'dd/MM/yyyy HH:mm' }}</p>
                <p class="pending-status">Esperando aprobación del administrador</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mis equipos aprobados -->
      <div class="approved-section" *ngIf="myTeams.length > 0">
        <h2>Mis Grupos ({{ myTeams.length }})</h2>
        <div class="teams-grid">
          <div *ngFor="let team of myTeams" class="team-card">
            <div class="team-logo">
              <img *ngIf="team.logoUrl" [src]="team.logoUrl" [alt]="team.name">
              <span *ngIf="!team.logoUrl" class="default-logo">⚽</span>
            </div>
            <div class="team-info">
              <h3>{{ team.name }}</h3>
              <p class="team-members">👥 {{ team.memberCount || 0 }} miembros</p>
              <span class="badge badge-success">✅ Miembro</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Estado vacío -->
      <div *ngIf="myTeams.length === 0 && pendingMemberships.length === 0 && !loading" class="empty-state">
        <div class="empty-icon">📭</div>
        <h2>No perteneces a ningún equipo</h2>
        <p>Ingresa el código de invitación arriba para unirte a un equipo</p>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Cargando...</p>
      </div>
    </div>
  `,
  styles: [`
    .join-team-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }

    .page-header {
      margin-bottom: 32px;
    }

    .page-header h1 {
      font-size: 32px;
      font-weight: 700;
      color: var(--dark-color);
      margin: 0;
    }

    .join-card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      text-align: center;
      margin-bottom: 32px;
    }

    .join-icon {
      font-size: 64px;
      margin-bottom: 16px;
    }

    .join-card h2 {
      font-size: 24px;
      color: var(--dark-color);
      margin-bottom: 12px;
    }

    .join-description {
      color: #666;
      margin-bottom: 32px;
      line-height: 1.6;
    }

    .code-input-container {
      display: flex;
      gap: 12px;
      max-width: 400px;
      margin: 0 auto 16px;
    }

    .code-input {
      flex: 1;
      padding: 16px 20px;
      border: 2px solid var(--border-color);
      border-radius: 12px;
      font-size: 20px;
      font-weight: 600;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 4px;
      transition: all 0.3s;
    }

    .code-input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .code-input.error {
      border-color: #ef4444;
    }

    .info-note {
      background: #f0f9ff;
      border-left: 4px solid #3b82f6;
      padding: 12px 16px;
      border-radius: 8px;
      margin-top: 24px;
      text-align: left;
      color: #1e40af;
      font-size: 14px;
    }

    .pending-section,
    .approved-section {
      margin-bottom: 32px;
    }

    .pending-section h2,
    .approved-section h2 {
      font-size: 20px;
      color: var(--dark-color);
      margin-bottom: 16px;
    }

    .pending-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .pending-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .pending-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .pending-icon {
      font-size: 40px;
    }

    .pending-card h3 {
      font-size: 18px;
      color: var(--dark-color);
      margin: 0 0 4px 0;
    }

    .pending-date {
      font-size: 14px;
      color: #666;
      margin: 4px 0;
    }

    .pending-status {
      font-size: 14px;
      color: #f59e0b;
      font-weight: 500;
      margin: 4px 0;
    }

    .teams-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 16px;
    }

    .team-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .team-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .team-logo {
      width: 80px;
      height: 80px;
      margin: 0 auto 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      overflow: hidden;
    }

    .team-logo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .default-logo {
      font-size: 40px;
    }

    .team-info {
      text-align: center;
    }

    .team-info h3 {
      font-size: 18px;
      color: var(--dark-color);
      margin: 0 0 8px 0;
    }

    .team-members {
      font-size: 14px;
      color: #666;
      margin: 4px 0;
    }

    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 8px;
    }

    .badge-success {
      background: #d1fae5;
      color: #065f46;
    }

    .success-message {
      background: #d1fae5;
      color: #065f46;
      padding: 12px 16px;
      border-radius: 8px;
      margin-top: 16px;
      font-weight: 500;
    }

    .error-message {
      background: #fee2e2;
      color: #991b1b;
      padding: 12px 16px;
      border-radius: 8px;
      margin-top: 16px;
      font-weight: 500;
    }

    .empty-state {
      background: white;
      border-radius: 16px;
      padding: 60px 40px;
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
      color: #666;
      font-size: 16px;
    }

    .loading-state {
      text-align: center;
      padding: 60px 20px;
    }

    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid var(--border-color);
      border-top-color: var(--primary-color);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .btn {
      padding: 16px 24px;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      white-space: nowrap;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .join-card {
        padding: 24px;
      }

      .code-input-container {
        flex-direction: column;
      }

      .teams-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class JoinTeamComponent implements OnInit {
  private teamService = inject(TeamService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);

  myTeams: Team[] = [];
  pendingMemberships: TeamMember[] = [];
  teamsCache: { [key: number]: Team } = {};
  loading = false;
  submitting = false;
  successMessage = '';
  errorMessage = '';

  joinForm: FormGroup = this.fb.group({
    joinCode: ['', [
      Validators.required, 
      Validators.minLength(6), 
      Validators.maxLength(6),
      Validators.pattern(/^[A-Za-z0-9]{6}$/)
    ]]
  });

  ngOnInit(): void {
    this.loadMyMemberships();
    // Si la URL contiene ?code=ABC123, prellenar y enviar la solicitud automáticamente
    try {
      const code = this.route.snapshot.queryParamMap.get('code');
      if (code && typeof code === 'string' && code.trim().length === 6) {
        // Prefill the form and auto-submit after small delay to allow auth flows
        this.joinForm.patchValue({ joinCode: code.toUpperCase() });
        setTimeout(() => {
          // Only submit if the form is valid
          if (this.joinForm.valid) this.submitJoinRequest();
        }, 400);
      }
    } catch (e) {
      // ignore if ActivatedRoute not available in some contexts
    }
  }

  loadMyMemberships(): void {
    this.loading = true;
    this.teamService.getMyMemberships().subscribe({
      next: (memberships) => {
        // Filtrar membresías aprobadas y pendientes
        const approved = memberships.filter(m => m.status === 'APPROVED');
        const pending = memberships.filter(m => m.status === 'PENDING');
        this.pendingMemberships = pending;

        // Si no hay aprobadas, limpiar y salir
        if (approved.length === 0) {
          this.myTeams = [];
          this.loading = false;
          return;
        }

        // Poblar myTeams con info mínima y luego consultar miembros para el contador
        this.myTeams = approved.map(m => ({
          id: m.teamId,
          name: m.teamName || 'Equipo',
          joinCode: m.joinCode || '',
          logoUrl: undefined,
          description: undefined,
          ownerUserId: 0,
          ownerEmail: undefined,
          memberCount: 0,
          pendingRequestsCount: undefined,
          members: undefined,
          address: undefined,
          latitude: undefined,
          longitude: undefined,
          placeId: undefined,
          createdAt: '',
          updatedAt: ''
        }));
        // Consultar miembros aprobados para cada equipo y actualizar memberCount
        const memberRequests = this.myTeams.map(team =>
          this.teamService.getMembers(team.id)
        );
        if (memberRequests.length === 0) {
          this.loading = false;
        } else {
          Promise.all(memberRequests.map(obs => obs.toPromise())).then(membersArr => {
            this.myTeams.forEach((team, idx) => {
              team.memberCount = (membersArr[idx] || []).filter((m: any) => m.status === 'APPROVED').length;
            });
            this.loading = false;
          }).catch(() => {
            this.loading = false;
          });
        }
      },
      error: (error) => {
        console.error('Error loading memberships:', error);
        this.loading = false;
      }
    });
  }

  submitJoinRequest(): void {
    if (this.joinForm.invalid) return;

    this.submitting = true;
    this.successMessage = '';
    this.errorMessage = '';

    const joinCode = this.joinForm.value.joinCode.toUpperCase();

    this.teamService.joinTeam(joinCode).subscribe({
      next: (membership) => {
        this.submitting = false;
        // Recargar membresías para reflejar el nuevo estado
        this.loadMyMemberships();
        const teamName = membership.teamName || this.getTeamName(membership.teamId) || 'el grupo';
        if (membership.status === 'APPROVED') {
          this.successMessage = `✅ ¡Te has unido al grupo "${teamName}" exitosamente!`;
        } else {
          this.successMessage = `✅ Solicitud enviada a "${teamName}". Esperando aprobación del administrador.`;
        }
        this.joinForm.reset();
        setTimeout(() => {
          this.successMessage = '';
        }, 6000);
      },
      error: (error) => {
        this.submitting = false;
        if (error.status === 404) {
          this.errorMessage = '❌ Código inválido. El grupo no existe.';
        } else if (error.status === 409) {
          this.errorMessage = '⚠️ Ya eres miembro de este grupo.';
        } else if (error.status === 400) {
          this.errorMessage = '❌ No puedes unirte a tu propio grupo.';
        } else {
          this.errorMessage = '❌ Error de conexión. Intenta nuevamente.';
        }
        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
      }
    });
  }

  getTeamName(teamId: number): string {
    return this.teamsCache[teamId]?.name || 'Equipo';
  }
}
