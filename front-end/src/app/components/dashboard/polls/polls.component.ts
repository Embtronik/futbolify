import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TeamService } from '../../../services/team.service';
import { FootballApiService } from '../../../services/football-api.service';
import { PollService } from '../../../services/poll.service';
import { 
  Poll, 
  PollMatch, 
  Team, 
  TeamMember,
  FootballTeam,
  FootballLeague,
  CreatePollRequest,
  AddPollMatchRequest,
  FootballFixture
} from '../../../models/football.model';


@Component({
  selector: 'app-polls',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './polls.component.html',
  styleUrls: ['./polls.component.css']
})
export class PollsComponent implements OnInit {
  // ...existing code...

  private getBackendErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      const payload = err.error;
      if (payload && typeof payload === 'object') {
        const maybeMessage = (payload as any).message;
        if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
          return maybeMessage;
        }
        const maybeError = (payload as any).error;
        if (typeof maybeError === 'string' && maybeError.trim()) {
          return maybeError;
        }
      }

      if (typeof payload === 'string' && payload.trim()) {
        // Sometimes backends send JSON as a string
        try {
          const parsed = JSON.parse(payload);
          const parsedMessage = (parsed as any)?.message;
          if (typeof parsedMessage === 'string' && parsedMessage.trim()) {
            return parsedMessage;
          }
        } catch {
          // ignore JSON parse errors
        }
        return payload;
      }

      if (typeof err.message === 'string' && err.message.trim()) {
        return err.message;
      }
    }

    return fallback;
  }

  predictionErrors: Record<number, string> = {};

  isPredictionLocked(match: PollMatch): boolean {
    return !this.pollService.canPredict(match);
  }

  getPredictionRowMessage(match: PollMatch): string | null {
    const existing = this.predictionErrors[match.id];
    if (typeof existing === 'string' && existing.trim()) return existing;
    if (this.isPredictionLocked(match)) return 'Ya no se pueden registrar pronósticos para este partido';
    return null;
  }

  /**
   * Guarda todos los pronósticos de los partidos en la polla actual (Por Participar)
   */
  saveAllPredictions(): void {
    if (!this.selectedPoll) return;

    if (this.savingPredictions) return;
    this.savingPredictions = true;

    const attemptedMatches = this.pollMatches.filter(
      (match) => typeof match.golesLocalPronosticado === 'number' && typeof match.golesVisitantePronosticado === 'number'
    );

    // Clear old row errors for matches being attempted again
    for (const match of attemptedMatches) {
      delete this.predictionErrors[match.id];
    }

    // Locked matches should not be sent; show per-row message
    const lockedAttempts = attemptedMatches.filter((m) => this.isPredictionLocked(m));
    for (const match of lockedAttempts) {
      this.predictionErrors[match.id] = 'Ya no se pueden registrar pronósticos para este partido';
    }

    const unlockedAttempts = attemptedMatches.filter((m) => !this.isPredictionLocked(m));
    const predictions: { pollaPartidoId: number; golesLocalPronosticado: number; golesVisitantePronosticado: number }[] = unlockedAttempts.map(
      (match) => ({
        pollaPartidoId: match.id,
        golesLocalPronosticado: match.golesLocalPronosticado as number,
        golesVisitantePronosticado: match.golesVisitantePronosticado as number,
      })
    );

    if (predictions.length === 0) {
      if (lockedAttempts.length > 0) {
        // Per-row errors already shown
        this.savingPredictions = false;
        return;
      }
      this.errorMessage = 'Debes ingresar al menos un marcador.';
      setTimeout(() => (this.errorMessage = ''), 3000);
      this.savingPredictions = false;
      return;
    }

    this.teamService.saveMultiplePredictions(this.selectedPoll.id, predictions).subscribe({
      next: () => {
        this.successMessage = 'Pronósticos guardados correctamente';
        this.savingPredictions = false;
        this.closePollDetail();
        setTimeout(() => (this.successMessage = ''), 3000);
      },
      error: (err: unknown) => {
        const backendMsg = this.getBackendErrorMessage(err, 'Error al guardar los pronósticos');

        // Business-rule error: show it under the attempted matches and keep it visible
        if (err instanceof HttpErrorResponse && err.status === 400) {
          for (const match of unlockedAttempts) {
            this.predictionErrors[match.id] = backendMsg;
          }
          this.savingPredictions = false;
          return;
        }

        this.errorMessage = backendMsg;
        this.savingPredictions = false;
        setTimeout(() => (this.errorMessage = ''), 5000);
      }
    });
  }
  savePrediction(match: PollMatch): void {
    if (!this.selectedPoll) return;
    if (typeof match.golesLocalPronosticado !== 'number' || typeof match.golesVisitantePronosticado !== 'number') {
      this.errorMessage = 'Debes ingresar ambos marcadores.';
      return;
    }
    const prediction = {
      pollaPartidoId: match.id,
      golesLocalPronosticado: match.golesLocalPronosticado,
      golesVisitantePronosticado: match.golesVisitantePronosticado
    };
    if (typeof (this.teamService as any).savePrediction === 'function') {
      (this.teamService as any).savePrediction(this.selectedPoll.id, prediction).subscribe({
        next: (resp: any) => {
          this.successMessage = 'Pronóstico guardado correctamente';
          setTimeout(() => this.successMessage = '', 2000);
        },
        error: (err: unknown) => {
          this.errorMessage = this.getBackendErrorMessage(err, 'Error al guardar el pronóstico');
          setTimeout(() => this.errorMessage = '', 2000);
        }
      });
    } else {
      this.errorMessage = 'Función de guardado individual no implementada en el servicio.';
      setTimeout(() => this.errorMessage = '', 2000);
    }
  }

  // Partidos seleccionados en el modal de agregar partido
  selectedFixtures: FootballFixture[] = [];

  selectFixture(fixture: FootballFixture): void {
    const fixtureId = fixture.fixture.id;
    const alreadySelected = this.selectedFixtures.some(f => f.fixture.id === fixtureId);
    this.selectedFixtures = alreadySelected
      ? this.selectedFixtures.filter(f => f.fixture.id !== fixtureId)
      : [...this.selectedFixtures, fixture];
  }

  removeSelectedFixture(fixture: FootballFixture): void {
    this.selectedFixtures = this.selectedFixtures.filter(f => f.fixture.id !== fixture.fixture.id);
  }

  revertPollToCreated(poll: Poll | null | undefined, event?: Event): void {
    event?.stopPropagation();

    if (!this.isPoll(poll)) return;

    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.teamService.revertPollToCreated(poll.id).subscribe({
      next: (updatedPoll: Poll | null) => {
        if (!this.isPoll(updatedPoll)) {
          this.successMessage = 'Polla regresada a estado creada';
          this.loading = false;
          this.loadData();
          if (this.showPollDetailModal) this.closePollDetail();
          setTimeout(() => (this.successMessage = ''), 2000);
          return;
        }

        const replace = (arr: any[]) => (arr || []).filter(this.isPoll).map(p => (p.id === updatedPoll.id ? updatedPoll : p));
        this.myPolls = replace(this.myPolls);
        this.participantPolls = replace(this.participantPolls);
        this.polls = replace(this.polls);
        if (this.selectedPoll?.id === updatedPoll.id) this.selectedPoll = updatedPoll;

        this.successMessage = 'Polla regresada a estado creada';
        this.loading = false;
        if (this.showPollDetailModal) this.closePollDetail();
        setTimeout(() => (this.successMessage = ''), 2000);
      },
      error: (err: unknown) => {
        console.error('Error revertPollToCreated:', err);
        this.errorMessage = 'Error al revertir la polla';
        this.loading = false;
        setTimeout(() => (this.errorMessage = ''), 2000);
      },
    });
  }

  private teamService = inject(TeamService);
  private footballApiService = inject(FootballApiService);
  private pollService = inject(PollService);
  private fb = inject(FormBuilder);

  // State
  polls: Poll[] = [];
  myPolls: Poll[] = [];
  participantPolls: Poll[] = [];
  myTeams: Team[] = [];
  footballLeagues: FootballLeague[] = [];
  footballTeams: FootballTeam[] = [];
  upcomingFixtures: FootballFixture[] = [];
  selectedPoll: Poll | null = null;
  pollMatches: PollMatch[] = [];
  currentUserEmail = '';

  private readonly isPoll = (value: any): value is Poll => !!value && typeof value.id === 'number';
  
  // UI State
  loading = false;
  loadingFixtures = false;
  savingPredictions = false;
  showCreateModal = false;
  showAddMatchModal = false;
  showPollDetailModal = false;
  activeTab: 'my-polls' | 'invited' = 'my-polls';
  addMatchStep: 'league' | 'fixtures' = 'league';
  isParticiparView = false;
  
  // Forms
  createPollForm!: FormGroup;
  addMatchForm!: FormGroup;
  
  // Messages
  successMessage = '';
  errorMessage = '';
  
  // Search
  leagueSearchQuery = '';
  filteredLeagues: FootballLeague[] = [];
  selectedLeague: FootballLeague | null = null;

  ngOnInit(): void {
    this.initializeForms();
    this.loadData();
  }

  initializeForms(): void {
    // Formulario de crear polla
    this.createPollForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: [''],
      gruposIds: [[], Validators.required],
      fechaInicio: ['', Validators.required],
      montoEntrada: [0, [Validators.min(1)]],
      emailsInvitados: [[]]
    });

    // Formulario de agregar partido
    this.addMatchForm = this.fb.group({
      homeTeamId: ['', Validators.required],
      awayTeamId: ['', Validators.required],
      matchDate: ['', Validators.required],
      league: ['']
    });
  }

  loadData(): void {
      // LOG para depuración de filtrado
      // Se limpia en producción
    this.loading = true;
    (this.teamService as any).getMyPolls().subscribe({
      next: (allPolls: Poll[]) => {
        const safePolls: Poll[] = (allPolls || []).filter(
          (p: any): p is Poll => !!p && typeof p.id === 'number'
        );

        if (safePolls.length === 0) {
          this.myPolls = [];
          this.participantPolls = [];
          this.polls = [];
          this.loading = false;
          return;
        }
        // Tomar el email del usuario autenticado del primer objeto (todos traen el mismo)
        const userEmail = (safePolls[0].emailUsuarioAutenticado || '').toLowerCase().trim();
        this.currentUserEmail = userEmail;
        console.log('[DEBUG] userEmail autenticado:', userEmail);
        console.log('[DEBUG] Array completo de pollas:', safePolls);
        this.myPolls = safePolls.filter((p: Poll) => (p.creadorEmail || '').toLowerCase().trim() === userEmail);
        this.participantPolls = safePolls; // Todas las pollas, incluyendo las creadas por el usuario
        console.log('[DEBUG] participantPolls:', this.participantPolls);
        this.polls = (this.activeTab === 'my-polls' ? this.myPolls : this.participantPolls).filter(this.isPoll);
        this.loading = false;

        // Enriquecer cards con conteos reales (partidos/invitados/participantes)
        this.enrichPollCountsForCards(safePolls);
      },
      error: (error: any) => {
        this.errorMessage = 'Error al cargar las pollas';
        this.loading = false;
        console.error('Error getMyPolls:', error);
      }
    });

    // Cargar grupos del usuario (para invitar) con sus miembros
    (this.teamService as any).getAll().subscribe({
      next: (teams: Team[]) => {
        const safeTeams: Team[] = (teams || []).filter((t: any): t is Team => !!t && typeof t.id === 'number');
        // Cargar miembros de cada grupo en paralelo
        if (safeTeams.length > 0) {
          const memberRequests = safeTeams.map((team: Team) =>
            (this.teamService as any).getMembers(team.id)
          );
          
          forkJoin(memberRequests).subscribe({
            next: (membersArrays) => {
              // Asignar miembros a cada grupo
              (safeTeams as Team[]).forEach((team: Team, index: number) => {
                (team as any).members = (membersArrays as TeamMember[][])[index];
              });
              this.myTeams = safeTeams;
            },
            error: (error) => {
              console.error('Error loading members:', error);
              this.myTeams = safeTeams; // Usar grupos sin miembros como fallback
            }
          });
        } else {
          this.myTeams = safeTeams;
        }
      },
      error: (error: any) => {
        console.error('Error loading teams:', error);
      }
    });

    // Cargar ligas disponibles
    this.footballApiService.getLeagues().subscribe({
      next: (leagues) => {
        this.footballLeagues = leagues;
        this.filteredLeagues = leagues;
      },
      error: (error) => {
        console.error('❌ Error cargando ligas:', error);
      }
    });
  }

  private enrichPollCountsForCards(polls: Poll[]): void {
    if (!polls || polls.length === 0) return;

    const safePolls: Poll[] = polls.filter((p: any): p is Poll => !!p && typeof p.id === 'number');
    if (safePolls.length === 0) return;

    const detailRequests = safePolls.map((p) =>
      this.teamService.getPollById(p.id).pipe(
        catchError((err: unknown) => {
          console.warn(`[polls] No se pudo cargar detalle de la polla ${p.id}:`, err);
          return of(null as unknown as Poll);
        })
      )
    );
    forkJoin(detailRequests).subscribe({
      next: (details: Poll[]) => {
        const byId = new Map<number, Poll>();
        for (const d of details) {
          if (d && typeof d.id === 'number') {
            byId.set(d.id, d);
          }
        }

        const mergeCounts = (p: Poll): Poll => {
          const detail = byId.get(p.id);
          if (!detail) return p;
          return {
            ...p,
            // only overwrite the count-ish fields
            totalPartidos: detail.totalPartidos ?? detail.partidos?.length ?? p.totalPartidos,
            totalParticipantes: detail.totalParticipantes ?? detail.participantes?.length ?? p.totalParticipantes,
            partidosCount: detail.partidosCount ?? detail.totalPartidos ?? detail.partidos?.length ?? p.partidosCount,
            participantesCount: detail.participantesCount ?? detail.totalParticipantes ?? detail.participantes?.length ?? p.participantesCount,
          };
        };

        this.myPolls = (this.myPolls || []).filter(this.isPoll).map(mergeCounts);
        this.participantPolls = (this.participantPolls || []).filter(this.isPoll).map(mergeCounts);
        this.polls = (this.activeTab === 'my-polls' ? this.myPolls : this.participantPolls).filter(this.isPoll);
      },
      error: (err: unknown) => {
        // Si falla, dejamos los conteos como vengan del listado
        console.warn('No se pudieron enriquecer los conteos de pollas:', err);
      }
    });
  }

  // ========== Gestión de Pollas ========== 

  onTabChange(tab: 'my-polls' | 'invited') {
    this.activeTab = tab;
    const next = tab === 'my-polls' ? this.myPolls : this.participantPolls;
    this.polls = (next || []).filter((p: any): p is Poll => !!p && typeof p.id === 'number');
    console.log('[DEBUG] Tab cambiado:', tab, 'Polls mostradas:', this.polls);
  }

  openCreateModal(): void {
    this.showCreateModal = true;
    this.createPollForm.reset({ teamIds: [], entryFee: 0 });
    this.successMessage = '';
    this.errorMessage = '';
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  onSubmitCreatePoll(): void {
    if (this.createPollForm.invalid) return;

    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const formValue = this.createPollForm.value;
    const selectedTeamIds = formValue.gruposIds || [];
    
    // Obtener emails de todos los miembros APROBADOS de los grupos seleccionados
    const emailsInvitados: string[] = [];
    const selectedTeams = this.myTeams.filter(team => selectedTeamIds.includes(team.id));
    
    selectedTeams.forEach(team => {
      if (team.members) {
        team.members
          .filter(member => member.status === 'APPROVED')
          .forEach(member => {
            if (member.userEmail && !emailsInvitados.includes(member.userEmail)) {
              emailsInvitados.push(member.userEmail);
            }
          });
      }
    });
    
    // Construir el objeto con el formato correcto
    const pollData: CreatePollRequest = {
      nombre: formValue.nombre,
      descripcion: formValue.descripcion || '',
      fechaInicio: formValue.fechaInicio ? new Date(formValue.fechaInicio).toISOString().slice(0, 16) : '',
      montoEntrada: Number(formValue.montoEntrada) || 0,
      gruposIds: selectedTeamIds,
      emailsInvitados: emailsInvitados
    };

    console.log('📤 Dashboard enviando creación de polla:', pollData);

    (this.teamService as any).createPoll(pollData).subscribe({
      next: (newPoll: Poll | null) => {
        this.loading = false;
        this.successMessage = '¡Polla creada exitosamente!';

        // Some backends return an empty body on 201/200. Avoid injecting null into the UI.
        if (!this.isPoll(newPoll)) {
          this.loadData();
          setTimeout(() => {
            this.closeCreateModal();
          }, 1500);
          return;
        }

        this.myPolls = [newPoll, ...(this.myPolls || []).filter(this.isPoll)];
        this.participantPolls = [newPoll, ...(this.participantPolls || []).filter(this.isPoll)];
        this.polls = (this.activeTab === 'my-polls' ? this.myPolls : this.participantPolls).filter(this.isPoll);

        setTimeout(() => {
          this.closeCreateModal();
          this.openPollDetail(newPoll);
        }, 1500);
      },
      error: (error: any) => {
        this.loading = false;
        this.errorMessage = error.error?.message || 'Error al crear la polla';
        console.error('❌ Error al crear polla:', error);
      }
    });
  }

  toggleTeamSelection(teamId: number): void {
    const currentTeams = this.createPollForm.get('gruposIds')?.value || [];
    const index = currentTeams.indexOf(teamId);
    
    if (index > -1) {
      currentTeams.splice(index, 1);
    } else {
      currentTeams.push(teamId);
    }
    
    this.createPollForm.patchValue({ gruposIds: currentTeams });
  }

  isTeamSelected(teamId: number): boolean {
    const currentTeams = this.createPollForm.get('gruposIds')?.value || [];
    return currentTeams.includes(teamId);
  }

  deletePoll(poll: Poll, event: Event): void {
    event.stopPropagation();
    if (!confirm(`¿Estás seguro de eliminar la polla "${poll.nombre}"?`)) return;

    (this.teamService as any).deletePoll(poll.id).subscribe({
      next: () => {
        this.polls = (this.polls || []).filter((p: any): p is Poll => this.isPoll(p) && p.id !== poll.id);
        this.successMessage = 'Polla eliminada correctamente';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error: any) => {
        this.errorMessage = 'Error al eliminar la polla';
      }
    });
  }

  activatePoll(poll: Poll | null | undefined, event?: Event): void {
    event?.stopPropagation();
    if (!this.isPoll(poll)) return;
    if (!confirm(`¿Activar la polla "${poll.nombre}"? No podrás agregar más partidos.`)) return;

    (this.teamService as any).activatePoll(poll.id).subscribe({
      next: (updatedPoll: Poll | null) => {
        if (!this.isPoll(updatedPoll)) {
          this.successMessage = 'Polla activada correctamente';
          this.loadData();
          if (this.showPollDetailModal) this.closePollDetail();
          setTimeout(() => this.successMessage = '', 3000);
          return;
        }

        const sanitized = (this.polls || []).filter(this.isPoll);
        const index = sanitized.findIndex(p => p.id === poll.id);
        if (index > -1) sanitized[index] = updatedPoll;
        this.polls = sanitized;

        if (this.selectedPoll?.id === updatedPoll.id) this.selectedPoll = updatedPoll;

        this.successMessage = 'Polla activada correctamente';
        if (this.showPollDetailModal) this.closePollDetail();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error: any) => {
        this.errorMessage = 'Error al activar la polla';
      }
    });
  }

  // ========== Gestión de Partidos ==========

  openPollDetail(poll: Poll): void {
    console.log('[DEBUG] openPollDetail called with poll:', poll);
    if (!poll || typeof (poll as any).id !== 'number') return;
    this.selectedPoll = poll;
    if (!this.currentUserEmail) {
      this.currentUserEmail = (poll.emailUsuarioAutenticado || '').toLowerCase().trim();
    }
    this.isParticiparView = (this.activeTab === 'invited');
    this.showPollDetailModal = true;
    this.refreshSelectedPollDetail(poll.id);
    this.loadPollMatches(poll.id);
  }

  private refreshSelectedPollDetail(pollId: number): void {
    this.teamService.getPollById(pollId).subscribe({
      next: (fullPoll: Poll) => {
        // If user navigated away quickly, avoid updating stale state
        if (!this.selectedPoll || this.selectedPoll.id !== pollId) return;

        // Merge to preserve any local UI-only fields, while updating counts
        this.selectedPoll = { ...this.selectedPoll, ...fullPoll };

        const replace = (arr: Poll[]) => (arr || []).filter((p: any): p is Poll => !!p && typeof p.id === 'number')
          .map(p => (p.id === pollId ? { ...p, ...fullPoll } : p));
        this.myPolls = replace(this.myPolls);
        this.participantPolls = replace(this.participantPolls);
        this.polls = replace(this.polls);
      },
      error: (err: unknown) => {
        console.warn('No se pudo cargar detalle de la polla:', err);
      }
    });
  }

  closePollDetail(): void {
    console.log('[DEBUG] closePollDetail called');
    this.showPollDetailModal = false;
    this.selectedPoll = null;
    this.pollMatches = [];
    this.predictionErrors = {};
    this.savingPredictions = false;
  }

  loadPollMatches(pollId: number): void {
    (this.teamService as any).getPollMatches(pollId).subscribe({
      next: (matches: PollMatch[]) => {
        const safeMatches: PollMatch[] = (matches || []).filter((m: any): m is PollMatch => !!m && typeof m.id === 'number');

        if (!this.isParticiparView) {
          this.pollMatches = safeMatches;
          this.predictionErrors = {};
          return;
        }

        const email = (this.currentUserEmail || this.selectedPoll?.emailUsuarioAutenticado || '').toLowerCase().trim();

        this.pollMatches = safeMatches.map((m: PollMatch) => {
          const nextMatch: PollMatch = { ...m };
          const pronosticos = (m as any).pronosticos;
          if (!email || !Array.isArray(pronosticos)) return nextMatch;

          const my = pronosticos.find((p: any) => (p?.emailParticipante || '').toLowerCase().trim() === email);
          if (!my) return nextMatch;

          // Precargar el pronóstico del usuario
          nextMatch.golesLocalPronosticado = my.golesLocalPronosticado;
          nextMatch.golesVisitantePronosticado = my.golesVisitantePronosticado;
          return nextMatch;
        });
        this.predictionErrors = {};
      },
      error: (error: any) => {
        console.error('Error loading matches:', error);
      }
    });
  }

  openAddMatchModal(): void {
    console.clear();
    console.log('openAddMatchModal called');
    console.log('selectedPoll:', this.selectedPoll);
    this.showAddMatchModal = true;
    this.addMatchForm.reset();
    this.successMessage = '';
    this.errorMessage = '';
  }

  closeAddMatchModal(): void {
    this.showAddMatchModal = false;
  }

  onSubmitAddMatch(): void {
    console.clear();
    console.log('onSubmitAddMatch called');
    console.log('selectedFixtures:', this.selectedFixtures);
    console.log('selectedPoll:', this.selectedPoll);

    if (!this.selectedPoll) {
      console.log('No poll selected');
      return;
    }
    if (!this.selectedFixtures.length) {
      this.errorMessage = 'Debes seleccionar al menos un partido.';
      this.loading = false;
      return;
    }

    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    let addedCount = 0;
    let errorCount = 0;
    this.selectedFixtures.forEach((fixture, idx) => {
      let fechaHoraPartido = fixture.fixture.date;
      if (fechaHoraPartido) {
        fechaHoraPartido = fechaHoraPartido.substring(0, 19);
      }
      const matchData: AddPollMatchRequest = {
        pollaId: this.selectedPoll!.id,
        idPartidoExterno: fixture.fixture.id.toString(),
        equipoLocal: fixture.teams.home.name,
        equipoLocalLogo: fixture.teams.home.logo,
        equipoVisitante: fixture.teams.away.name,
        equipoVisitanteLogo: fixture.teams.away.logo,
        fechaHoraPartido: fechaHoraPartido,
        liga: fixture.league.name
      };
      (this.teamService as any).addPollMatch(matchData).subscribe({
        next: (newMatch: PollMatch) => {
          this.pollMatches.push(newMatch);
          addedCount++;
          if (addedCount + errorCount === this.selectedFixtures.length) {
            this.loading = false;
            if (addedCount > 0) {
              this.successMessage = `${addedCount} partido(s) agregados exitosamente!`;
              this.showAddMatchModal = false;
              setTimeout(() => { this.successMessage = ''; }, 2000);
            }
            if (errorCount > 0) {
              this.errorMessage = `${errorCount} partido(s) no se pudieron agregar.`;
            }
          }
        },
        error: (error: any) => {
          errorCount++;
          if (addedCount + errorCount === this.selectedFixtures.length) {
            this.loading = false;
            if (addedCount > 0) {
              this.successMessage = `${addedCount} partido(s) agregados exitosamente!`;
              this.showAddMatchModal = false;
              setTimeout(() => { this.successMessage = ''; }, 2000);
            }
            if (errorCount > 0) {
              this.errorMessage = `${errorCount} partido(s) no se pudieron agregar.`;
            }
          }
        }
      });
    });
  }

  deleteMatch(match: PollMatch): void {
    if (!this.selectedPoll) return;
    if (!confirm(`¿Eliminar el partido ${match.equipoLocal} vs ${match.equipoVisitante}?`)) return;

    (this.teamService as any).deletePollMatch(this.selectedPoll.id, match.id).subscribe({
      next: () => {
        this.pollMatches = this.pollMatches.filter(m => m.id !== match.id);
        this.successMessage = 'Partido eliminado correctamente';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error: any) => {
        this.errorMessage = 'Error al eliminar el partido';
      }
    });
  }

  // ========== Búsqueda de Equipos ==========

  searchLeagues(query: string): void {
    this.leagueSearchQuery = query;
    if (!query.trim()) {
      this.filteredLeagues = this.footballLeagues;
      return;
    }

    this.filteredLeagues = this.footballLeagues.filter(league =>
      league.name.toLowerCase().includes(query.toLowerCase()) ||
      league.country.toLowerCase().includes(query.toLowerCase())
    );
  }

  /**
   * Cuando se selecciona una liga, carga sus partidos próximos desde hoy
   */
  selectLeague(league: FootballLeague): void {
    this.selectedLeague = league;
    this.addMatchStep = 'fixtures';
    this.loadingFixtures = true;
    this.upcomingFixtures = [];
    console.log('🔍 Liga seleccionada:', league.name);
    console.log('🌍 País:', league.country);
    // Obtener partidos desde la fecha actual en adelante
    // Ahora la temporada se obtiene por getActiveSeason, no por league.season
    this.footballApiService.getActiveSeason(league.id).subscribe({
      next: (season) => {
        if (!season) {
          this.loadingFixtures = false;
          this.errorMessage = 'No se encontró temporada activa para esta liga';
          setTimeout(() => this.errorMessage = '', 3000);
          return;
        }
        this.footballApiService.getUpcomingFixtures(league.id, season).subscribe({
          next: (fixtures) => {
            this.upcomingFixtures = fixtures;
            this.loadingFixtures = false;
            console.log('✅ Próximos partidos cargados:', fixtures.length);
            if (fixtures.length === 0) {
              this.errorMessage = 'No hay partidos próximos para esta liga';
              setTimeout(() => this.errorMessage = '', 3000);
            }
          },
          error: (error) => {
            console.error('❌ Error al cargar partidos:', error);
            this.loadingFixtures = false;
            this.errorMessage = 'Error al cargar partidos de la liga';
            setTimeout(() => this.errorMessage = '', 3000);
          }
        });
      },
      error: (error) => {
        console.error('❌ Error al cargar temporada activa:', error);
        this.loadingFixtures = false;
        this.errorMessage = 'Error al consultar la temporada de la liga';
        setTimeout(() => this.errorMessage = '', 3000);
      }
    });
  }
  selectAwayTeam(team: FootballTeam): void {
    this.addMatchForm.patchValue({ awayTeamId: team.id });
  }

  getSelectedHomeTeam(): FootballTeam | undefined {
    const homeTeamId = this.addMatchForm.get('homeTeamId')?.value;
    return this.footballTeams.find((t: FootballTeam) => t.id === homeTeamId);
  }

  getSelectedAwayTeam(): FootballTeam | undefined {
    const awayTeamId = this.addMatchForm.get('awayTeamId')?.value;
    return this.footballTeams.find((t: FootballTeam) => t.id === awayTeamId);
  }

  /**
   * Vuelve al paso de selección de liga en el modal de agregar partido
   */
  backToLeagueSelection(): void {
    this.addMatchStep = 'league';
    this.selectedLeague = null;
    this.upcomingFixtures = [];
  }

  // ========== Utilidades ==========

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'DRAFT': return 'badge-draft';
      case 'ACTIVE': return 'badge-active';
      case 'FINISHED': return 'badge-finished';
      default: return '';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'DRAFT': return 'Borrador';
      case 'ACTIVE': return 'Activa';
      case 'FINISHED': return 'Finalizada';
      default: return status;
    }
  }


  formatDateTime(dateValue: string | Date): string {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }) + ' ' + date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }
}
