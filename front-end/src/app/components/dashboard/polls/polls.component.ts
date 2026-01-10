import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { TeamService } from '../../../services/team.service';
import { FootballApiService } from '../../../services/football-api.service';
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
  /**
   * Guarda todos los pronósticos de los partidos en la polla actual (Por Participar)
   */
  saveAllPredictions(): void {
    if (!this.selectedPoll) return;
    const predictions: { pollaPartidoId: number; golesLocalPronosticado: number; golesVisitantePronosticado: number }[] = this.pollMatches
      .filter((match: PollMatch): match is PollMatch & { golesLocalPronosticado: number; golesVisitantePronosticado: number } =>
        typeof match.golesLocalPronosticado === 'number' && typeof match.golesVisitantePronosticado === 'number')
      .map((match) => ({
        pollaPartidoId: match.id,
        golesLocalPronosticado: match.golesLocalPronosticado as number,
        golesVisitantePronosticado: match.golesVisitantePronosticado as number
      }));
    if (predictions.length === 0) {
      this.errorMessage = 'Debes ingresar al menos un marcador.';
      setTimeout(() => this.errorMessage = '', 2000);
      return;
    }
    this.teamService.saveMultiplePredictions(this.selectedPoll.id, predictions).subscribe({
      next: () => {
        this.successMessage = 'Pronósticos guardados correctamente';
        setTimeout(() => this.successMessage = '', 2000);
      },
      error: () => {
        this.errorMessage = 'Error al guardar los pronósticos';
        setTimeout(() => this.errorMessage = '', 2000);
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
        error: () => {
          this.errorMessage = 'Error al guardar el pronóstico';
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

  revertPollToCreated(poll: Poll, event?: Event): void {
    event?.stopPropagation();

    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.teamService.revertPollToCreated(poll.id).subscribe({
      next: (updatedPoll: Poll) => {
        const replace = (arr: Poll[]) => arr.map(p => (p.id === updatedPoll.id ? updatedPoll : p));
        this.myPolls = replace(this.myPolls);
        this.participantPolls = replace(this.participantPolls);
        this.polls = replace(this.polls);
        if (this.selectedPoll?.id === updatedPoll.id) {
          this.selectedPoll = updatedPoll;
        }

        this.successMessage = 'Polla regresada a estado creada';
        this.loading = false;
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
  
  // UI State
  loading = false;
  loadingFixtures = false;
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
        if (!allPolls || allPolls.length === 0) {
          this.myPolls = [];
          this.participantPolls = [];
          this.polls = [];
          this.loading = false;
          return;
        }
        // Tomar el email del usuario autenticado del primer objeto (todos traen el mismo)
        const userEmail = (allPolls[0].emailUsuarioAutenticado || '').toLowerCase().trim();
        console.log('[DEBUG] userEmail autenticado:', userEmail);
        console.log('[DEBUG] Array completo de pollas:', allPolls);
        this.myPolls = allPolls.filter((p: Poll) => (p.creadorEmail || '').toLowerCase().trim() === userEmail);
        this.participantPolls = allPolls; // Todas las pollas, incluyendo las creadas por el usuario
        console.log('[DEBUG] participantPolls:', this.participantPolls);
        this.polls = this.activeTab === 'my-polls' ? this.myPolls : this.participantPolls;
        this.loading = false;
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
        // Cargar miembros de cada grupo en paralelo
        if (teams.length > 0) {
          const memberRequests = teams.map((team: Team) =>
            (this.teamService as any).getMembers(team.id)
          );
          
          forkJoin(memberRequests).subscribe({
            next: (membersArrays) => {
              // Asignar miembros a cada grupo
              (teams as Team[]).forEach((team: Team, index: number) => {
                (team as any).members = (membersArrays as TeamMember[][])[index];
              });
              this.myTeams = teams;
            },
            error: (error) => {
              console.error('Error loading members:', error);
              this.myTeams = teams; // Usar grupos sin miembros como fallback
            }
          });
        } else {
          this.myTeams = teams;
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

  // ========== Gestión de Pollas ========== 

  onTabChange(tab: 'my-polls' | 'invited') {
    this.activeTab = tab;
    this.polls = tab === 'my-polls' ? this.myPolls : this.participantPolls;
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
      next: (newPoll: Poll) => {
        this.polls.unshift(newPoll);
        this.loading = false;
        this.successMessage = '¡Polla creada exitosamente!';
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
        this.polls = this.polls.filter(p => p.id !== poll.id);
        this.successMessage = 'Polla eliminada correctamente';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error: any) => {
        this.errorMessage = 'Error al eliminar la polla';
      }
    });
  }

  activatePoll(poll: Poll, event: Event): void {
    event.stopPropagation();
    if (!confirm(`¿Activar la polla "${poll.nombre}"? No podrás agregar más partidos.`)) return;

    (this.teamService as any).activatePoll(poll.id).subscribe({
      next: (updatedPoll: Poll) => {
        const index = this.polls.findIndex(p => p.id === poll.id);
        if (index > -1) {
          this.polls[index] = updatedPoll;
        }
        this.successMessage = 'Polla activada correctamente';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error: any) => {
        this.errorMessage = 'Error al activar la polla';
      }
    });
  }

  // ========== Gestión de Partidos ==========

  openPollDetail(poll: Poll): void {
    this.selectedPoll = poll;
    this.isParticiparView = (this.activeTab === 'invited');
    this.showPollDetailModal = true;
    this.loadPollMatches(poll.id);
  }

  closePollDetail(): void {
    this.showPollDetailModal = false;
    this.selectedPoll = null;
    this.pollMatches = [];
  }

  loadPollMatches(pollId: number): void {
    (this.teamService as any).getPollMatches(pollId).subscribe({
      next: (matches: PollMatch[]) => {
        this.pollMatches = matches;
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
