// ...existing code...

@Injectable({
  providedIn: 'root'
})
export class TeamService {
  private readonly API_URL = 'http://localhost:8082/api';
  private http = inject(HttpClient);

  /**
   * Guardar múltiples pronósticos de una polla (batch)
   */
  saveMultiplePredictions(pollId: number, predictions: CreatePredictionRequest[]): Observable<any> {
    return this.http.post<any>(
      `${this.API_URL}/pollas/${pollId}/pronosticos/batch`,
      predictions
    );
  }
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  Team, 
  Player, 
  JoinTeamRequest,
  TeamMember,
  ApproveMemberRequest,
  Poll,
  PollMatch,
  PollPrediction,
  PollInvitation,
  CreatePollRequest,
  AddPollMatchRequest,
  CreatePredictionRequest,
  Match
} from '../models/football.model';

/**
 * Servicio centralizado para la administración de grupos (teams)
 * Incluye: grupos, jugadores, pollas, partidos, invitaciones y predicciones
 * 
 * NOTA: AuthService maneja autenticación y NotificationService maneja notificaciones
 */
@Injectable({
  providedIn: 'root'
})
export class TeamService {
    /**
     * Volver una polla activa a estado CREADA (permite edición)
     */
    revertPollToCreated(pollId: number): Observable<Poll> {
      return this.http.put<Poll>(`${this.API_URL}/pollas/${pollId}/a-creada`, {});
    }
  private readonly API_URL = 'http://localhost:8082/api';
  private http = inject(HttpClient);

  // ==========================================
  // GESTIÓN DE GRUPOS (TEAMS)
  // ==========================================

  /**
   * Obtener todos los grupos del usuario autenticado
   * Endpoint: GET /api/teams
   */
  getAll(): Observable<Team[]> {
    return this.http.get<Team[]>(`${this.API_URL}/teams`);
  }

  /**
   * Obtener grupos donde el usuario es administrador
   * Nota: Por ahora retorna lo mismo que getAll() hasta que backend implemente este endpoint
   */
  getMyTeams(): Observable<Team[]> {
    return this.http.get<Team[]>(`${this.API_URL}/teams`);
  }

  /**
   * Obtener un grupo por ID
   * Endpoint: GET /api/teams/{teamId}
   */
  getById(id: number): Observable<Team> {
    return this.http.get<Team>(`${this.API_URL}/teams/${id}`);
  }

  /**
   * Crear un nuevo grupo con logo opcional
   * Endpoint: POST /api/teams
   * Backend genera automáticamente el código alfanumérico único
   * @param teamData FormData con: name, description?, foundationDate?, logo? (File)
   */
  create(teamData: FormData): Observable<Team> {
    return this.http.post<Team>(`${this.API_URL}/teams`, teamData);
  }

  /**
   * Actualizar un grupo con logo opcional
   * Endpoint: PUT /api/teams/{teamId}
   * @param id ID del equipo a actualizar
   * @param teamData FormData con: name?, description?, foundationDate?, logo? (File)
   */
  update(id: number, teamData: FormData): Observable<Team> {
    return this.http.put<Team>(`${this.API_URL}/teams/${id}`, teamData);
  }

  /**
   * Eliminar un grupo
   * Endpoint: DELETE /api/teams/{teamId}
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/teams/${id}`);
  }

  // ==========================================
  // GESTIÓN DE MEMBRESÍA (MEMBERSHIP)
  // ==========================================

  /**
   * Unirse a un equipo usando código de invitación
   * Endpoint: POST /api/teams/join/{joinCode}
   * Crea una solicitud con status "PENDING" (requiere aprobación) o "APPROVED" (automático)
   * @param joinCode Código de 6 caracteres del equipo
   * @returns TeamMember con status y datos de la membresía
   */
  joinTeam(joinCode: string): Observable<TeamMember> {
    return this.http.post<TeamMember>(`${this.API_URL}/teams/join/${joinCode}`, {});
  }

  /**
   * Obtener solicitudes pendientes de un equipo (solo admin/owner)
   * Endpoint: GET /api/teams/{teamId}/pending-requests
   */
  getPendingRequests(teamId: number): Observable<TeamMember[]> {
    return this.http.get<TeamMember[]>(`${this.API_URL}/teams/${teamId}/pending-requests`);
  }

  /**
   * Aprobar o rechazar una solicitud de membresía (solo admin/owner)
   * Endpoint: PUT /api/teams/{teamId}/members/{memberId}
   */
  approveMember(teamId: number, memberId: number, approved: boolean): Observable<TeamMember> {
    return this.http.put<TeamMember>(`${this.API_URL}/teams/${teamId}/members/${memberId}`, { approved });
  }

  /**
   * Obtener miembros aprobados de un equipo
   * Endpoint: GET /api/teams/{teamId}/members
   */
  getMembers(teamId: number): Observable<TeamMember[]> {
    return this.http.get<TeamMember[]>(`${this.API_URL}/teams/${teamId}/members`);
  }

  /**
   * Obtener grupos donde el usuario es miembro aprobado
   * Endpoint: GET /api/teams/my-memberships
   */
  getMyMemberships(): Observable<Team[]> {
    return this.http.get<Team[]>(`${this.API_URL}/teams/my-memberships`);
  }

  // ==========================================
  // GESTIÓN DE JUGADORES (PLAYERS)
  // ==========================================

  /**
   * Obtener todos los jugadores de un grupo
   */
  getPlayers(teamId: number): Observable<Player[]> {
    return this.http.get<Player[]>(`${this.API_URL}/teams/${teamId}/players`);
  }

  /**
   * Obtener jugadores del usuario (todos los grupos donde es miembro)
   */
  getMyPlayers(): Observable<Player[]> {
    return this.http.get<Player[]>(`${this.API_URL}/players/my-players`);
  }

  /**
   * Registrar un nuevo jugador en un grupo
   */
  registerPlayer(playerData: FormData): Observable<Player> {
    return this.http.post<Player>(`${this.API_URL}/players`, playerData);
  }

  /**
   * Actualizar información de un jugador
   */
  updatePlayer(playerId: number, playerData: FormData): Observable<Player> {
    return this.http.put<Player>(`${this.API_URL}/players/${playerId}`, playerData);
  }

  /**
   * Eliminar un jugador de un grupo
   */
  deletePlayer(playerId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/players/${playerId}`);
  }

  // ==========================================
  // GESTIÓN DE POLLAS
  // ==========================================

  /**
   * Obtener todas las pollas del usuario (creadas o invitado)
   */
  getPolls(): Observable<Poll[]> {
    return this.http.get<Poll[]>(`${this.API_URL}/pollas`);
  }

  /**
   * Obtener pollas creadas por el usuario
   */
  getMyPolls(): Observable<Poll[]> {
    return this.http.get<Poll[]>(`${this.API_URL}/pollas/mis-pollas`);
  }

  /**
   * Obtener pollas donde el usuario está invitado
   */
  getInvitedPolls(): Observable<Poll[]> {
    return this.http.get<Poll[]>(`${this.API_URL}/pollas/invitaciones`);
  }

  /**
   * Obtener una polla por ID
   */
  getPollById(pollId: number): Observable<Poll> {
    return this.http.get<Poll>(`${this.API_URL}/pollas/${pollId}`);
  }

  /**
   * Crear una nueva polla
   * Automáticamente crea invitaciones a los grupos seleccionados
   */
  createPoll(pollData: CreatePollRequest): Observable<Poll> {
    return this.http.post<Poll>(`${this.API_URL}/pollas`, pollData);
  }

  /**
   * Actualizar una polla (solo si está en DRAFT)
   */
  updatePoll(pollId: number, pollData: Partial<Poll>): Observable<Poll> {
    return this.http.put<Poll>(`${this.API_URL}/pollas/${pollId}`, pollData);
  }

  /**
   * Eliminar una polla
   */
  deletePoll(pollId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/pollas/${pollId}`);
  }

  /**
   * Activar una polla (cambiar de DRAFT a ACTIVE)
   * Una vez activa, no se pueden agregar más partidos
   */
  activatePoll(pollId: number): Observable<Poll> {
    return this.http.put<Poll>(`${this.API_URL}/pollas/${pollId}/activar`, {});
  }

  /**
   * Finalizar una polla (cambiar de ACTIVE a FINISHED)
   * Calcula puntos de todas las predicciones
   */
  finishPoll(pollId: number): Observable<Poll> {
    return this.http.put<Poll>(`${this.API_URL}/pollas/${pollId}/finalizar`, {});
  }

  // ==========================================
  // GESTIÓN DE PARTIDOS DE POLLAS
  // ==========================================

  /**
   * Obtener todos los partidos de una polla
   */
  getPollMatches(pollId: number): Observable<PollMatch[]> {
    return this.http.get<PollMatch[]>(`${this.API_URL}/pollas/${pollId}/partidos`);
  }

  /**
   * Agregar un partido a una polla (solo en estado DRAFT)
   */
  addPollMatch(matchData: AddPollMatchRequest): Observable<PollMatch> {
    return this.http.post<PollMatch>(
      `${this.API_URL}/pollas/${matchData.pollaId}/partidos`, 
      matchData
    );
  }

  /**
   * Actualizar resultado de un partido
   * Automáticamente recalcula puntos de predicciones
   */
  updatePollMatch(pollId: number, matchId: number, matchData: Partial<PollMatch>): Observable<PollMatch> {
    return this.http.put<PollMatch>(
      `${this.API_URL}/pollas/${pollId}/partidos/${matchId}`, 
      matchData
    );
  }

  /**
   * Eliminar un partido de una polla (solo en estado DRAFT)
   */
  deletePollMatch(pollId: number, matchId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/pollas/${pollId}/partidos/${matchId}`);
  }

  // ==========================================
  // GESTIÓN DE PREDICCIONES
  // ==========================================

  /**
   * Obtener todas las predicciones de una polla
   */
  getPollPredictions(pollId: number): Observable<PollPrediction[]> {
    return this.http.get<PollPrediction[]>(`${this.API_URL}/pollas/${pollId}/pronosticos`);
  }

  /**
   * Obtener predicciones del usuario para una polla específica
   */
  getMyPredictions(pollId: number): Observable<PollPrediction[]> {
    return this.http.get<PollPrediction[]>(`${this.API_URL}/pollas/${pollId}/mis-pronosticos`);
  }

  /**
   * Crear o actualizar predicción de un partido
   * Solo se permite antes de que inicie el partido
   */
  savePrediction(pollId: number, predictionData: CreatePredictionRequest): Observable<PollPrediction> {
    return this.http.post<PollPrediction>(
      `${this.API_URL}/pollas/${pollId}/pronosticos`, 
      predictionData
    );
  }

  /**
   * Eliminar una predicción (solo antes de que inicie el partido)
   */
  deletePrediction(pollId: number, predictionId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/pollas/${pollId}/pronosticos/${predictionId}`);
  }

  // ==========================================
  // GESTIÓN DE INVITACIONES A POLLAS
  // ==========================================

  /**
   * Obtener invitaciones pendientes del usuario
   */
  getMyInvitations(): Observable<PollInvitation[]> {
    return this.http.get<PollInvitation[]>(`${this.API_URL}/pollas/invitaciones`);
  }

  /**
   * Aceptar invitación a una polla
   * Permite al usuario participar y hacer predicciones
   */
  acceptInvitation(pollId: number): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/pollas/${pollId}/aceptar`, {});
  }

  /**
   * Rechazar invitación a una polla
   */
  rejectInvitation(pollId: number): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/pollas/${pollId}/rechazar`, {});
  }

  // ==========================================
  // RANKING Y ESTADÍSTICAS
  // ==========================================

  /**
   * Obtener ranking de una polla (tabla de posiciones)
   * Ordenado por puntos totales
   */
  getPollRanking(pollId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/pollas/${pollId}/ranking`);
  }

  /**
   * Obtener estadísticas detalladas de un usuario en una polla
   */
  getUserPollStats(pollId: number, userId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/teams/polls/${pollId}/users/${userId}/stats`);
  }

  /**
   * Obtener estadísticas generales de un grupo
   */
  getTeamStats(teamId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/teams/${teamId}/stats`);
  }

  // ==========================================
  // GESTIÓN DE PARTIDOS REGULARES (no de pollas)
  // ==========================================

  /**
   * Obtener todos los partidos de un grupo
   */
  getMatches(teamId: number): Observable<Match[]> {
    return this.http.get<Match[]>(`${this.API_URL}/teams/${teamId}/matches`);
  }

  /**
   * Crear un partido entre equipos del grupo
   */
  createMatch(matchData: Partial<Match>): Observable<Match> {
    return this.http.post<Match>(`${this.API_URL}/teams/matches`, matchData);
  }

  /**
   * Actualizar un partido
   */
  updateMatch(matchId: number, matchData: Partial<Match>): Observable<Match> {
    return this.http.put<Match>(`${this.API_URL}/teams/matches/${matchId}`, matchData);
  }

  /**
   * Eliminar un partido
   */
  deleteMatch(matchId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/teams/matches/${matchId}`);
  }
}
