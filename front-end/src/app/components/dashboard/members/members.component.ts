// ...existing code...
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TeamService } from '../../../services/team.service';
import { Team, TeamMember } from '../../../models/football.model';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models/user.model';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="members-container">

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1>Integrantes por Grupo</h1>
          <p class="page-subtitle">Visualiza y gestiona los integrantes de cada grupo</p>
        </div>
      </div>

      <!-- Search -->
      <div class="search-bar" *ngIf="teams.length > 0">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Buscar integrante..."
          [(ngModel)]="searchTerm"
          class="search-input"
        />
      </div>

      <!-- Loading global -->
      <div *ngIf="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Cargando grupos...</p>
      </div>

      <!-- Empty state -->
      <div *ngIf="!loading && teams.length === 0" class="empty-state">
        <div class="empty-icon">👥</div>
        <h2>No tienes grupos aún</h2>
        <p>Crea un grupo o únete a uno para ver sus integrantes aquí.</p>
      </div>

      <!-- Lista de equipos -->
      <div *ngIf="!loading && teams.length > 0" class="teams-list">
        <div *ngFor="let team of teams" class="team-block">

          <!-- Cabecera del equipo -->
          <div class="team-header" (click)="toggleTeam(team.id)">
            <div class="team-header-left">
              <img *ngIf="team.logoUrl" [src]="team.logoUrl" [alt]="team.name" class="team-logo" />
              <div *ngIf="!team.logoUrl" class="team-logo-placeholder">⚽</div>
              <div>
                <h3 class="team-name">{{ team.name }}</h3>
                <span class="team-meta">
                  <span class="badge-approved">✔ {{ getApprovedCount(team.id) }} aprobados</span>
                  <span class="badge-pending" *ngIf="getPendingCount(team.id) > 0">
                    ⏳ {{ getPendingCount(team.id) }} pendiente(s)
                  </span>
                  <span class="badge-owner" *ngIf="isOwner(team)">👑 Administrador</span>
                </span>
              </div>
            </div>
            <div class="team-header-right">
              <span class="chevron" [class.open]="expandedTeams.has(team.id)">▼</span>
            </div>
          </div>

          <!-- Cuerpo expandido -->
          <div class="team-body" *ngIf="expandedTeams.has(team.id)">

            <!-- Loading miembros -->
            <div *ngIf="loadingMembers[team.id]" class="loading-inline">
              <div class="spinner small"></div> Cargando integrantes...
            </div>

            <!-- Sin miembros -->
            <div
              *ngIf="!loadingMembers[team.id] && getFilteredMembers(team.id).length === 0"
              class="no-members"
            >
              No hay integrantes{{ searchTerm ? ' que coincidan con la búsqueda' : '' }}.
            </div>

            <!-- Solicitudes pendientes (solo para owner) -->
            <div *ngIf="isOwner(team) && getPendingFiltered(team.id).length > 0" class="section-label pending-label">
              ⏳ Solicitudes pendientes
            </div>
            <div
              *ngFor="let member of getPendingFiltered(team.id)"
              class="member-row pending-row"
            >
              <div class="member-avatar">{{ getInitials(member) }}</div>
              <div class="member-info">
                <span class="member-name">{{ getMemberName(member) }}</span>
                <span class="member-email">{{ member.userEmail }}</span>
                <span class="member-date">Solicitó: {{ formatDate(member.requestedAt) }}</span>
              </div>
              <div class="member-actions" *ngIf="isOwner(team)">
                <button class="btn-approve" (click)="approveMember(team.id, member.id)">✔ Aprobar</button>
                <button class="btn-reject"  (click)="rejectMember(team.id, member.id)">✕ Rechazar</button>
              </div>
            </div>

            <!-- Miembros aprobados -->
            <div *ngIf="getApprovedFiltered(team.id).length > 0" class="section-label">
              ✔ Integrantes aprobados
            </div>
            <div
              *ngFor="let member of getApprovedFiltered(team.id)"
              class="member-row approved-row"
            >
              <div class="member-avatar approved">{{ getInitials(member) }}</div>
              <div class="member-info">
                <span class="member-name">{{ getMemberName(member) }}</span>
                <span class="member-email">{{ member.userEmail }}</span>
                <span class="member-date">Desde: {{ formatDate(member.approvedAt || member.requestedAt) }}</span>
              </div>
              <div class="member-status">
                <span class="status-chip approved">Aprobado</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .members-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 8px 0;
    }
    .page-header { margin-bottom: 20px; }
    .page-header h1 { font-size: 28px; font-weight: 700; color: var(--dark-color, #1a1a2e); margin: 0 0 4px; }
    .page-subtitle  { color: #666; font-size: 14px; margin: 0; }

    /* Search */
    .search-bar {
      display: flex; align-items: center;
      background: white; border: 1px solid #e0e0e0; border-radius: 12px;
      padding: 10px 16px; margin-bottom: 24px; gap: 10px;
    }
    .search-icon { font-size: 16px; }
    .search-input { border: none; outline: none; flex: 1; font-size: 14px; background: transparent; }

    /* States */
    .loading-state, .empty-state {
      text-align: center; padding: 60px 20px; color: #888;
    }
    .empty-icon { font-size: 64px; margin-bottom: 16px; }
    .empty-state h2 { font-size: 22px; color: #444; margin-bottom: 8px; }
    .loading-inline {
      display: flex; align-items: center; gap: 10px;
      padding: 16px 20px; color: #888; font-size: 14px;
    }

    /* Spinner */
    .spinner {
      width: 36px; height: 36px; border: 3px solid #e0e0e0;
      border-top-color: var(--primary-color, #667eea);
      border-radius: 50%; animation: spin .7s linear infinite;
      margin: 0 auto 16px;
    }
    .spinner.small { width: 18px; height: 18px; margin: 0; border-width: 2px; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Teams list */
    .teams-list { display: flex; flex-direction: column; gap: 16px; }
    .team-block {
      background: white; border-radius: 16px; border: 1px solid #e8e8e8;
      overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.04);
    }

    /* Team header */
    .team-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; cursor: pointer; user-select: none;
      transition: background .15s;
    }
    .team-header:hover { background: #f8f9ff; }
    .team-header-left { display: flex; align-items: center; gap: 14px; }
    .team-logo { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; }
    .team-logo-placeholder {
      width: 44px; height: 44px; border-radius: 50%;
      background: linear-gradient(135deg,#667eea,#764ba2);
      display: flex; align-items: center; justify-content: center;
      font-size: 22px;
    }
    .team-name { font-size: 17px; font-weight: 600; color: #1a1a2e; margin: 0 0 4px; }
    .team-meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

    .badge-approved { font-size: 12px; color: #27ae60; font-weight: 500; }
    .badge-pending  { font-size: 12px; color: #e67e22; font-weight: 600;
      background: #fff3e0; padding: 2px 8px; border-radius: 20px; }
    .badge-owner    { font-size: 12px; color: #667eea; font-weight: 500; }

    .chevron { font-size: 12px; color: #999; transition: transform .25s; }
    .chevron.open { transform: rotate(180deg); }

    /* Team body */
    .team-body { border-top: 1px solid #f0f0f0; padding: 8px 0; }
    .no-members { padding: 16px 20px; color: #aaa; font-size: 14px; text-align: center; }

    .section-label {
      padding: 10px 20px 4px; font-size: 12px; font-weight: 600;
      color: #888; text-transform: uppercase; letter-spacing: .5px;
    }
    .section-label.pending-label { color: #e67e22; }

    /* Member rows */
    .member-row {
      display: flex; align-items: center; gap: 14px;
      padding: 12px 20px; transition: background .15s;
    }
    .member-row:hover { background: #fafafa; }
    .pending-row { border-left: 3px solid #e67e22; }
    .approved-row { border-left: 3px solid transparent; }

    .member-avatar {
      width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg,#e67e22,#f39c12);
      display: flex; align-items: center; justify-content: center;
      color: white; font-weight: 700; font-size: 14px;
    }
    .member-avatar.approved {
      background: linear-gradient(135deg,#27ae60,#2ecc71);
    }
    .member-info {
      flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0;
    }
    .member-name  { font-weight: 600; font-size: 15px; color: #1a1a2e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .member-email { font-size: 12px; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .member-date  { font-size: 11px; color: #bbb; }

    .member-actions { display: flex; gap: 8px; flex-shrink: 0; }
    .btn-approve {
      padding: 6px 14px; border-radius: 8px; border: none; cursor: pointer;
      font-size: 13px; font-weight: 600;
      background: #27ae60; color: white; transition: background .2s;
    }
    .btn-approve:hover { background: #219a52; }
    .btn-reject {
      padding: 6px 14px; border-radius: 8px; border: none; cursor: pointer;
      font-size: 13px; font-weight: 600;
      background: #e74c3c; color: white; transition: background .2s;
    }
    .btn-reject:hover { background: #c0392b; }

    .member-status { flex-shrink: 0; }
    .status-chip {
      padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
    }
    .status-chip.approved { background: #e8f8f0; color: #27ae60; }

    @media (max-width: 600px) {
      .page-header h1 { font-size: 22px; }
      .member-row { flex-wrap: wrap; }
      .member-actions { width: 100%; justify-content: flex-end; padding-left: 54px; }
      .btn-approve, .btn-reject { flex: 1; text-align: center; }
    }
  `],
})
export class MembersComponent implements OnInit {
  searchTerm: string = '';
  expandedTeams: Set<number> = new Set();

  private teamService = inject(TeamService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  teams: Team[] = [];
  ownedTeamIds: Set<number> = new Set();
  teamMembers: { [teamId: number]: TeamMember[] } = {};
  loadingMembers: { [teamId: number]: boolean } = {};
  loading = false;
  currentUser: User | null = null;

  isOwner(team: Team): boolean {
    if (!team || !this.currentUser || !this.currentUser.email || !team.ownerEmail) {
      console.log('[isOwner] FALSO (no se puede comparar):', {
        equipo: team,
        usuarioActual: this.currentUser
      });
      return false;
    }
    const teamEmail = team.ownerEmail.toLowerCase().trim();
    const userEmail = this.currentUser.email.toLowerCase().trim();
    const result = teamEmail === userEmail;
    console.log('[isOwner] Comparando correos:', { correoOwner: teamEmail, correoUsuario: userEmail, esOwner: result });
    return result;
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUserValue();
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
        console.log('[members] owned teams:', owned);
        console.log('[members] memberships:', memberships);
        console.log('[members] currentUser:', this.currentUser);
        const safeOwned = (owned || []).filter((t: any): t is Team => !!t && typeof t.id === 'number');
        this.ownedTeamIds = new Set<number>(safeOwned.map(t => t.id));

        // Equipos donde el usuario es miembro aprobado (incluye owner y no-owner)
        const memberTeams = (memberships || [])
          .map((m) => {
            // Si el equipo está en owned, usar el objeto completo (con ownerUserId real)
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

        // Unir equipos donde es owner y donde es miembro aprobado (sin duplicados)
        const mergedMap = new Map<number, Team>();
        for (const t of safeOwned) mergedMap.set(t.id, t);
        for (const t of memberTeams) mergedMap.set(t.id, t);
        const mergedTeams = Array.from(mergedMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        // Consultar miembros reales para cada equipo y actualizar memberCount
        const memberRequests = mergedTeams.map(team =>
          this.teamService.getMembers(team.id).pipe(
            catchError(() => of([] as TeamMember[]))
          )
        );
        forkJoin(memberRequests).subscribe({
          next: (membersArr) => {
            mergedTeams.forEach((team, idx) => {
              team.memberCount = (membersArr[idx] || []).filter((m: any) => m.status === 'APPROVED').length;
            });
            this.teams = mergedTeams;
                // If navigation included a teamId query param, load its members automatically
                try {
                  const qp = this.route.snapshot.queryParams;
                  const targetId = qp && qp['teamId'] ? Number(qp['teamId']) : null;
                  if (targetId && Number.isFinite(targetId)) {
                    // Ensure team exists in list
                    if (mergedTeams.some(t => t.id === targetId)) {
                      this.loadMembers(targetId);
                    }
                  }
                } catch (e) {
                  // ignore
                }
                this.loading = false;
          },
          error: (err) => {
            console.error('Error cargando miembros:', err);
            this.teams = mergedTeams;
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
    //
    this.teamService.getMembers(teamId).pipe(
      catchError((err: unknown) => {
        console.error('Error loading members:', err);
        return of([] as TeamMember[]);
      })
    ).subscribe({
      next: (members) => {
        const sorted = [...members].sort((a, b) => {
          const w = (s: string | undefined) => (s === 'PENDING' ? 0 : s === 'APPROVED' ? 1 : 2);
          return w(a.status) - w(b.status);
        });
        this.teamMembers[teamId] = sorted;
        this.loadingMembers[teamId] = false;
      },
      error: (error) => {
        console.error('Error loading members:', error);
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

  toggleTeam(teamId: number): void {
    if (this.expandedTeams.has(teamId)) {
      this.expandedTeams.delete(teamId);
    } else {
      this.expandedTeams.add(teamId);
      if (!this.teamMembers[teamId] && !this.loadingMembers[teamId]) {
        this.loadMembers(teamId);
      }
    }
  }

  getMemberName(member: TeamMember): string {
    if (member.userInfo?.firstName) {
      return `${member.userInfo.firstName} ${member.userInfo.lastName ?? ''}`.trim();
    }
    return member.userEmail;
  }

  getInitials(member: TeamMember): string {
    const name = this.getMemberName(member);
    const parts = name.split(/[\s@]+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  getFilteredMembers(teamId: number): TeamMember[] {
    const members = this.teamMembers[teamId] ?? [];
    if (!this.searchTerm) return members;
    const term = this.searchTerm.toLowerCase();
    return members.filter(m =>
      (m.userInfo?.firstName ?? '').toLowerCase().includes(term) ||
      (m.userInfo?.lastName ?? '').toLowerCase().includes(term) ||
      (m.userEmail ?? '').toLowerCase().includes(term)
    );
  }

  getPendingFiltered(teamId: number): TeamMember[] {
    return this.getFilteredMembers(teamId).filter(m => m.status === 'PENDING');
  }

  getApprovedFiltered(teamId: number): TeamMember[] {
    return this.getFilteredMembers(teamId).filter(m => m.status === 'APPROVED');
  }

  getApprovedCount(teamId: number): number {
    return (this.teamMembers[teamId] ?? []).filter(m => m.status === 'APPROVED').length;
  }

  getPendingCount(teamId: number): number {
    return (this.teamMembers[teamId] ?? []).filter(m => m.status === 'PENDING').length;
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
