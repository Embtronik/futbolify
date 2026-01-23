import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TeamService } from '../../../services/team.service';
import { Team, TeamMember } from '../../../models/football.model';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="members-container">
      <div class="page-header">
        <h1>Integrantes de los Grupos</h1>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Cargando grupos...</p>
      </div>

      <!-- Lista de grupos con sus integrantes -->
      <div *ngIf="!loading && teams.length > 0" class="teams-list">
        <div *ngFor="let team of teams" class="team-section">
          <div class="team-header">
            <div class="team-header-info">
              <div class="team-logo-small">
                <img *ngIf="team.logoUrl" [src]="team.logoUrl" [alt]="team.name">
                <span *ngIf="!team.logoUrl">⚽</span>
              </div>
              <div>
                <h2>{{ team.name }}</h2>
                <p class="team-stats">
                  <span>👥 {{ team.memberCount || 0 }} miembros</span>
                  <span *ngIf="team.pendingRequestsCount" class="pending-badge">
                    ⏳ {{ team.pendingRequestsCount }} solicitudes pendientes
                  </span>
                </p>
              </div>
            </div>
            <button 
              class="btn btn-outline btn-sm" 
              (click)="loadMembers(team.id)"
              [disabled]="loadingMembers[team.id]"
            >
              {{ loadingMembers[team.id] ? 'Cargando...' : (teamMembers[team.id] ? 'Actualizar' : 'Ver Integrantes') }}
            </button>
          </div>

          <!-- Lista de miembros del equipo -->
          <div *ngIf="teamMembers[team.id]" class="members-grid">
            <div *ngFor="let member of teamMembers[team.id]" class="member-card" [class.pending]="member.status === 'PENDING'">
              <div class="member-avatar">
                <span class="avatar-icon">{{ member.userId === team.ownerUserId ? '👑' : '👤' }}</span>
              </div>
              <div class="member-info">
                <h4>
                  {{ member.userInfo?.firstName && member.userInfo?.lastName 
                     ? member.userInfo?.firstName + ' ' + member.userInfo?.lastName 
                     : member.userEmail }}
                </h4>
                <div class="member-details">
                  <p *ngIf="member.userEmail" class="detail-item">
                    <span class="detail-icon">📧</span>
                    {{ member.userEmail }}
                  </p>
                  <p *ngIf="member.userInfo?.phoneNumber" class="detail-item">
                    <span class="detail-icon">📱</span>
                    {{ (member.userInfo?.countryCode || '') + ' ' + member.userInfo?.phoneNumber }}
                  </p>
                  <p *ngIf="member.userInfo?.provider" class="detail-item">
                    <span class="detail-icon">{{ member.userInfo?.provider === 'GOOGLE' ? '🌐' : '🔑' }}</span>
                    {{ member.userInfo?.provider === 'GOOGLE' ? 'Cuenta Google' : 'Cuenta Local' }}
                  </p>
                </div>
                <div class="member-meta">
                  <span class="role-badge" *ngIf="member.userId === team.ownerUserId">Propietario</span>
                  <span class="status-badge" 
                    [class.approved]="member.status === 'APPROVED'" 
                    [class.pending]="member.status === 'PENDING'"
                    [class.rejected]="member.status === 'REJECTED'">
                    {{ member.status === 'APPROVED' ? '✅ Aprobado' : (member.status === 'PENDING' ? '⏳ Pendiente' : '❌ Rechazado') }}
                  </span>
                </div>
                <p class="member-date">
                  {{ member.status === 'APPROVED' ? 'Aprobado: ' + formatDate(member.approvedAt) : 'Solicitado: ' + formatDate(member.requestedAt) }}
                </p>
              </div>
              <div class="member-actions" *ngIf="member.status === 'PENDING' && member.userId !== team.ownerUserId">
                <button class="btn btn-sm btn-success" (click)="approveMember(team.id, member.id)" title="Aprobar">
                  ✓
                </button>
                <button class="btn btn-sm btn-danger" (click)="rejectMember(team.id, member.id)" title="Rechazar">
                  ✕
                </button>
              </div>
            </div>

            <div *ngIf="teamMembers[team.id]?.length === 0" class="empty-members">
              <p>No hay integrantes en este grupo aún</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Estado vacío -->
      <div *ngIf="!loading && teams.length === 0" class="empty-state">
        <div class="empty-icon">👥</div>
        <h2>No perteneces a ningún grupo</h2>
        <p>Crea un grupo o únete a uno existente para ver los integrantes</p>
      </div>
    </div>
  `,
  styles: [`
    .members-container {
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

    loadTeams() {
      // Carga equipos donde el usuario es owner y donde es miembro aprobado
      this.loadingTeams = true;
      this.teams = [];
      import('rxjs').then(rxjs => {
        rxjs.forkJoin({
          owner: this.teamService.getAll(), // equipos donde es owner
          member: this.teamService.getMyMemberships() // equipos donde es miembro aprobado
        }).subscribe(({ owner, member }) => {
          // Mapear owner teams
          const ownerGroups = owner.map(g => ({
            teamId: g.id,
            teamName: g.name ?? '',
            logoUrl: g.logoUrl,
            isOwner: true,
            raw: g
          }));
          // Mapear member teams
          const memberGroups = member.map(m => ({
            teamId: m.teamId,
            teamName: m.teamName ?? '',
            logoUrl: undefined,
            isOwner: false,
            raw: m
          }));
          // Unir y eliminar duplicados por teamId
          const allGroups: Array<{ teamId: number; teamName: string; logoUrl?: string; isOwner: boolean; raw: any }> =
            [...ownerGroups, ...memberGroups].reduce((acc, curr) => {
              if (!acc.some(g => g.teamId === curr.teamId)) acc.push(curr);
              return acc;
            }, [] as Array<{ teamId: number; teamName: string; logoUrl?: string; isOwner: boolean; raw: any }>);
          this.userGroups = allGroups;
        }, err => {
          this.loadingTeams = false;
          console.error('Error cargando grupos:', err);
        });
      });
    }
      border-radius: 16px;
      padding: 24px;
      border: 1px solid var(--border-color);
    }

    .team-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid var(--border-color);
    }

    .team-header-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .team-logo-small {
      width: 60px;
      height: 60px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      flex-shrink: 0;
      overflow: hidden;
    }

    .team-logo-small img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .team-header h2 {
      font-size: 24px;
      font-weight: 700;
      color: var(--dark-color);
      margin: 0 0 8px 0;
    }

    .team-stats {
      display: flex;
      gap: 16px;
      font-size: 14px;
      color: var(--gray-color);
      margin: 0;
    }

    .pending-badge {
      color: #f59e0b;
      font-weight: 600;
    }

    .members-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }

    .member-card {
      background: var(--light-color);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      gap: 12px;
      align-items: start;
      border: 2px solid transparent;
      transition: all 0.2s;
    }

    .member-card.pending {
      border-color: #fbbf24;
      background: #fef3c7;
    }

    .member-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .member-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
    }

    .member-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-icon {
      font-size: 24px;
    }

    .member-info {
      flex: 1;
    }

    .member-info h4 {
      font-size: 16px;
      font-weight: 600;
      color: var(--dark-color);
      margin: 0 0 8px 0;
    }

    .member-details {
      margin-bottom: 8px;
    }

    .detail-item {
      font-size: 13px;
      color: var(--gray-color);
      margin: 4px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .detail-icon {
      font-size: 14px;
    }

    .member-meta {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }

    .role-badge {
      background: #8b5cf6;
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-badge.approved {
      background: #d1fae5;
      color: #047857;
    }

    .status-badge.pending {
      background: #fef3c7;
      color: #92400e;
    }

    .status-badge.rejected {
      background: #fee2e2;
      color: #991b1b;
    }

    .member-date {
      font-size: 12px;
      color: var(--gray-color);
      margin: 0;
    }

    .member-actions {
      display: flex;
      gap: 8px;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 14px;
    }

    .btn-success {
      background: #10b981;
      color: white;
    }

    .btn-success:hover {
      background: #059669;
    }

    .btn-danger {
      background: #ef4444;
      color: white;
    }

    .btn-danger:hover {
      background: #dc2626;
    }

    .empty-members {
      text-align: center;
      padding: 40px 20px;
      color: var(--gray-color);
    }

    .empty-state {
      text-align: center;
      padding: 80px 20px;
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
      color: var(--gray-color);
      font-size: 16px;
    }

    @media (max-width: 768px) {
      .members-grid {
        grid-template-columns: 1fr;
      }

      .team-header {
        flex-direction: column;
        align-items: start;
        gap: 16px;
      }
    }
  `]
})
export class MembersComponent implements OnInit {
  private teamService = inject(TeamService);

  teams: Team[] = [];
  teamMembers: { [teamId: number]: TeamMember[] } = {};
  loadingMembers: { [teamId: number]: boolean } = {};
  loading = false;

  ngOnInit(): void {
    this.loadTeams();
  }

  loadTeams(): void {
    this.loading = true;

    // Queremos cubrir 2 casos:
    // - Owner: debe ver sus equipos (normalmente vienen en /teams para su usuario)
    // - Miembro aprobado: debe ver equipos donde pertenece (vienen en /teams/my-memberships)
    const ownedTeams$ = this.teamService.getAll().pipe(
      catchError((error: unknown) => {
        console.error('Error loading owned teams:', error);
        return of([] as Team[]);
      })
    );

    const memberships$ = this.teamService.getMyMemberships().pipe(
      catchError((error: unknown) => {
        console.error('Error loading my memberships:', error);
        return of([] as TeamMember[]);
      })
    );

    forkJoin({ owned: ownedTeams$, memberships: memberships$ }).subscribe({
      next: ({ owned, memberships }) => {
        const safeOwned = (owned || []).filter((t: any): t is Team => !!t && typeof t.id === 'number');
        const ownedIds = new Set<number>(safeOwned.map(t => t.id));

        const membershipTeamIds = Array.from(
          new Set(
            (memberships || [])
              .map((m) => m?.teamId)
              .filter((id): id is number => typeof id === 'number' && Number.isFinite(id))
          )
        );

        const missingTeamIds = membershipTeamIds.filter((id) => !ownedIds.has(id));
        if (missingTeamIds.length === 0) {
          this.teams = safeOwned.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          this.loading = false;
          return;
        }

        forkJoin(
          missingTeamIds.map((id) =>
            this.teamService.getById(id).pipe(
              catchError((err: unknown) => {
                console.warn(`No se pudo cargar detalle del grupo ${id}:`, err);
                return of(null as unknown as Team);
              })
            )
          )
        ).subscribe({
          next: (membershipTeams: Team[]) => {
            const safeMembershipTeams = (membershipTeams || []).filter((t: any): t is Team => !!t && typeof t.id === 'number');
            const merged = [...safeOwned, ...safeMembershipTeams];

            // Dedup por id
            const byId = new Map<number, Team>();
            for (const t of merged) byId.set(t.id, t);
            this.teams = Array.from(byId.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            this.loading = false;
          },
          error: (error: unknown) => {
            console.error('Error loading membership team details:', error);
            this.teams = safeOwned.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            this.loading = false;
          }
        });
      },
      error: (error: unknown) => {
        console.error('Error loading teams (owned + memberships):', error);
        this.teams = [];
        this.loading = false;
      }
    });
  }

  loadMembers(teamId: number): void {
    this.loadingMembers[teamId] = true;

    const approved$ = this.teamService.getMembers(teamId).pipe(
      catchError((err: unknown) => {
        console.error('Error loading approved members:', err);
        return of([] as TeamMember[]);
      })
    );

    const pending$ = this.teamService.getPendingRequests(teamId).pipe(
      catchError((err: unknown) => {
        // Solo el owner puede ver pendientes. Para no romper UI, hacemos fallback a [] en 403.
        if (err instanceof HttpErrorResponse && err.status === 403) {
          return of([] as TeamMember[]);
        }
        console.error('Error loading pending requests:', err);
        return of([] as TeamMember[]);
      })
    );

    forkJoin({ approved: approved$, pending: pending$ }).subscribe({
      next: ({ approved, pending }) => {
        console.log('[members] approved:', approved);
        console.log('[members] pending:', pending);

        const byId = new Map<number, TeamMember>();
        for (const m of [...(pending || []), ...(approved || [])]) {
          if (m && typeof (m as any).id === 'number') byId.set(m.id, m);
        }
        const merged = Array.from(byId.values());
        merged.sort((a, b) => {
          const w = (s: string | undefined) => (s === 'PENDING' ? 0 : s === 'APPROVED' ? 1 : 2);
          return w(a.status) - w(b.status);
        });

        if (merged.length > 0 && merged.some(m => m.userInfo === null)) {
          console.warn('⚠️ Algunos items vienen con userInfo: null (fallback esperado si auth-service no responde).');
        }

        this.teamMembers[teamId] = merged;
        this.loadingMembers[teamId] = false;
      },
      error: (error) => {
        console.error('Error loading members (merged):', error);
        this.loadingMembers[teamId] = false;
        alert('Error al cargar los integrantes del grupo');
      },
    });
  }

  approveMember(teamId: number, memberId: number): void {
    if (!confirm('¿Aprobar este integrante?')) return;

    this.teamService.approveMember(teamId, memberId, true).subscribe({
      next: () => {
        // Actualizar estado local
        const members = this.teamMembers[teamId];
        const member = members.find(m => m.id === memberId);
        if (member) {
          member.status = 'APPROVED';
          member.approvedAt = new Date();
        }
        alert('¡Integrante aprobado exitosamente!');
        this.loadMembers(teamId); // Recargar para actualizar contadores
      },
      error: (error) => {
        console.error('Error approving member:', error);
        alert('Error al aprobar el integrante');
      }
    });
  }

  rejectMember(teamId: number, memberId: number): void {
    if (!confirm('¿Rechazar esta solicitud?')) return;

    this.teamService.approveMember(teamId, memberId, false).subscribe({
      next: () => {
        // Remover de la lista local
        this.teamMembers[teamId] = this.teamMembers[teamId].filter(m => m.id !== memberId);
        alert('Solicitud rechazada');
        this.loadMembers(teamId); // Recargar para actualizar contadores
      },
      error: (error) => {
        console.error('Error rejecting member:', error);
        alert('Error al rechazar la solicitud');
      }
    });
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }
}
