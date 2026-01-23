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
  templateUrl: './members.component.html',
  styleUrls: ['./members.component.css'],
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
