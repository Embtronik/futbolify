// ...existing code...
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TeamService } from '../../../services/team.service';
import { Team, TeamMember } from '../../../models/football.model';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-members',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './members.component.html',
  styleUrls: ['./members.component.css'],
})
export class MembersComponent implements OnInit {
  // ...
  private teamService = inject(TeamService);
  private authService = inject(AuthService);

  teams: Team[] = [];
  ownedTeamIds: Set<number> = new Set();
  teamMembers: { [teamId: number]: TeamMember[] } = {};
  loadingMembers: { [teamId: number]: boolean } = {};
  loading = false;
  currentUser: User | null = null;

  isOwner(team: Team): boolean {
    if (!team || !this.currentUser || !this.currentUser.email || !team.ownerEmail) {
      console.log('[isOwner] FALSO:', {
        team,
        currentUser: this.currentUser
      });
      return false;
    }
    const teamEmail = team.ownerEmail.toLowerCase().trim();
    const userEmail = this.currentUser.email.toLowerCase().trim();
    const result = teamEmail === userEmail;
    console.log('[isOwner] Comparando:', { teamEmail, userEmail, result });
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
          .filter((m) => m.status === 'APPROVED')
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
    const team = this.teams.find(t => t.id === teamId);
    if (team && this.currentUser) {
      const teamOwnerEmail = (team.ownerEmail || '').toLowerCase().trim();
      const userEmail = (this.currentUser.email || '').toLowerCase().trim();
      const isOwner = teamOwnerEmail && userEmail && teamOwnerEmail === userEmail;
      console.log('[members] loadMembers: teamId', teamId, 'team.ownerEmail', teamOwnerEmail, 'currentUser.email', userEmail);
      console.log('[members] isOwner:', isOwner);
    }

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
