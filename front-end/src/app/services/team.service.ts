import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  AddPollMatchRequest,
  CreatePollRequest,
  CreatePredictionRequest,
  CreateTeamMatchRequest,
  MatchTeam,
  PlayerPosition,
  Player,
  Poll,
  PollInvitation,
  PollMatch,
  PollPrediction,
  Team,
  TeamMatch,
  TeamMatchAttendance,
  TeamMatchAttendanceSummary,
  MatchNotifyResponse,
  TeamMatchResult,
  TeamMatchResultUpsertRequest,
  TeamMember,
} from '../models/football.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TeamService {
  private readonly API_URL = environment.teamsApiUrl;
  private readonly http = inject(HttpClient);

  // ==========================================
  // GESTIÓN DE GRUPOS (TEAMS)
  // ==========================================

  getAll(page = 0, size = 50): Observable<Team[]> {
    return this.http
      .get<import('../models/football.model').Page<Team>>(`${this.API_URL}/teams`, {
        params: { page, size },
      })
      .pipe(map((res) => res?.content ?? []));
  }

  getMyTeams(page = 0, size = 50): Observable<Team[]> {
    // Si el backend no tiene /my-teams aún, ajustar aquí sin romper el tipado.
    return this.http
      .get<import('../models/football.model').Page<Team>>(`${this.API_URL}/teams`, {
        params: { page, size },
      })
      .pipe(map((res) => res?.content ?? []));
  }

  getById(id: number): Observable<Team> {
    return this.http.get<Team>(`${this.API_URL}/teams/${id}`);
  }

  // Crear equipo enviando JSON puro (sin logo)
  createJson(teamData: {
    name: string;
    description?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    placeId?: string;
  }): Observable<Team> {
    return this.http.post<Team>(`${this.API_URL}/teams`, teamData);
  }

  // Crear equipo enviando multipart/form-data (con logo opcional)
  create(teamData: FormData): Observable<Team> {
    return this.http.post<Team>(`${this.API_URL}/teams`, teamData);
  }

  update(id: number, teamData: FormData): Observable<Team> {
    return this.http.put<Team>(`${this.API_URL}/teams/${id}`, teamData);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/teams/${id}`);
  }

  // ==========================================
  // GESTIÓN DE MEMBRESÍA (MEMBERSHIP)
  // ==========================================

  joinTeam(joinCode: string): Observable<TeamMember> {
    return this.http.post<TeamMember>(`${this.API_URL}/teams/join/${joinCode}`, {});
  }

  getPendingRequests(teamId: number): Observable<TeamMember[]> {
    return this.http.get<TeamMember[]>(`${this.API_URL}/teams/${teamId}/pending-requests`);
  }

  approveMember(teamId: number, memberId: number, approved: boolean): Observable<TeamMember> {
    return this.http.put<TeamMember>(`${this.API_URL}/teams/${teamId}/members/${memberId}`, { approved });
  }

  getMembers(teamId: number): Observable<TeamMember[]> {
    return this.http.get<TeamMember[]>(`${this.API_URL}/teams/${teamId}/members`);
  }

  getMyMemberships(): Observable<Team[]> {
    return this.http.get<Team[]>(`${this.API_URL}/teams/my-memberships`);
  }

  // ==========================================
  // GESTIÓN DE JUGADORES (PLAYERS)
  // ==========================================

  getPlayers(teamId: number): Observable<Player[]> {
    return this.http.get<Player[]>(`${this.API_URL}/teams/${teamId}/players`);
  }

  getMyPlayers(): Observable<Player[]> {
    return this.http.get<Player[]>(`${this.API_URL}/players/my-players`);
  }

  registerPlayer(playerData: FormData): Observable<Player> {
    return this.http.post<Player>(`${this.API_URL}/players`, playerData);
  }

  updatePlayer(playerId: number, playerData: FormData): Observable<Player> {
    return this.http.put<Player>(`${this.API_URL}/players/${playerId}`, playerData);
  }

  deletePlayer(playerId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/players/${playerId}`);
  }

  // ==========================================
  // GESTIÓN DE POLLAS
  // ==========================================

  getPolls(): Observable<Poll[]> {
    return this.http.get<Poll[]>(`${this.API_URL}/pollas`);
  }

  getMyPolls(): Observable<Poll[]> {
    return this.http.get<Poll[]>(`${this.API_URL}/pollas/mis-pollas`);
  }

  getInvitedPolls(): Observable<Poll[]> {
    return this.http.get<Poll[]>(`${this.API_URL}/pollas/invitaciones`);
  }

  getPollById(pollId: number): Observable<Poll> {
    return this.http.get<Poll>(`${this.API_URL}/pollas/${pollId}`);
  }

  createPoll(pollData: CreatePollRequest): Observable<Poll> {
    return this.http.post<Poll>(`${this.API_URL}/pollas`, pollData);
  }

  updatePoll(pollId: number, pollData: Partial<Poll>): Observable<Poll> {
    return this.http.put<Poll>(`${this.API_URL}/pollas/${pollId}`, pollData);
  }

  deletePoll(pollId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/pollas/${pollId}`);
  }

  activatePoll(pollId: number): Observable<Poll> {
    return this.http.put<Poll>(`${this.API_URL}/pollas/${pollId}/activar`, {});
  }

  finishPoll(pollId: number): Observable<Poll> {
    return this.http.put<Poll>(`${this.API_URL}/pollas/${pollId}/finalizar`, {});
  }

  revertPollToCreated(pollId: number): Observable<Poll> {
    return this.http.put<Poll>(`${this.API_URL}/pollas/${pollId}/a-creada`, {});
  }

  // ==========================================
  // GESTIÓN DE PARTIDOS DE POLLAS
  // ==========================================

  getPollMatches(pollId: number): Observable<PollMatch[]> {
    return this.http.get<PollMatch[]>(`${this.API_URL}/pollas/${pollId}/partidos`);
  }

  addPollMatch(matchData: AddPollMatchRequest): Observable<PollMatch> {
    return this.http.post<PollMatch>(`${this.API_URL}/pollas/${matchData.pollaId}/partidos`, matchData);
  }

  updatePollMatch(pollId: number, matchId: number, matchData: Partial<PollMatch>): Observable<PollMatch> {
    return this.http.put<PollMatch>(`${this.API_URL}/pollas/${pollId}/partidos/${matchId}`, matchData);
  }

  deletePollMatch(pollId: number, matchId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/pollas/${pollId}/partidos/${matchId}`);
  }

  // ==========================================
  // GESTIÓN DE PREDICCIONES
  // ==========================================

  getPollPredictions(pollId: number): Observable<PollPrediction[]> {
    return this.http.get<PollPrediction[]>(`${this.API_URL}/pollas/${pollId}/pronosticos`);
  }

  getMyPredictions(pollId: number): Observable<PollPrediction[]> {
    return this.http.get<PollPrediction[]>(`${this.API_URL}/pollas/${pollId}/mis-pronosticos`);
  }

  savePrediction(pollId: number, predictionData: CreatePredictionRequest): Observable<PollPrediction> {
    return this.http.post<PollPrediction>(`${this.API_URL}/pollas/${pollId}/pronosticos`, predictionData);
  }

  saveMultiplePredictions(pollId: number, predictions: CreatePredictionRequest[]): Observable<unknown> {
    return this.http.post<unknown>(`${this.API_URL}/pollas/${pollId}/pronosticos/batch`, predictions);
  }

  deletePrediction(pollId: number, predictionId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/pollas/${pollId}/pronosticos/${predictionId}`);
  }

  // ==========================================
  // GESTIÓN DE INVITACIONES A POLLAS
  // ==========================================

  getMyInvitations(): Observable<PollInvitation[]> {
    return this.http.get<PollInvitation[]>(`${this.API_URL}/pollas/invitaciones`);
  }

  acceptInvitation(pollId: number): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/pollas/${pollId}/aceptar`, {});
  }

  rejectInvitation(pollId: number): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/pollas/${pollId}/rechazar`, {});
  }

  // ==========================================
  // RANKING Y ESTADÍSTICAS
  // ==========================================

  getPollRanking(pollId: number): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.API_URL}/pollas/${pollId}/ranking`);
  }

  getUserPollStats(pollId: number, userId: number): Observable<unknown> {
    return this.http.get<unknown>(`${this.API_URL}/teams/polls/${pollId}/users/${userId}/stats`);
  }

  getTeamStats(teamId: number): Observable<unknown> {
    return this.http.get<unknown>(`${this.API_URL}/teams/${teamId}/stats`);
  }

  // ==========================================
  // GESTIÓN DE PARTIDOS REGULARES (TEAM MATCHES)
  // ==========================================

  getMatches(teamId: number, page = 0, size = 50): Observable<TeamMatch[]> {
    return this.http
      .get<import('../models/football.model').Page<TeamMatch>>(`${this.API_URL}/teams/${teamId}/matches`, {
        params: { page, size },
      })
      .pipe(map((res) => res?.content ?? []));
  }

   getMatchAttendance(teamId: number, matchId: number): Observable<TeamMatchAttendance[]> {
    return this.http.get<TeamMatchAttendance[]>(`${this.API_URL}/teams/${teamId}/matches/${matchId}/attendance`);
  }

  getMatchAttendanceSummary(teamId: number, matchId: number): Observable<TeamMatchAttendanceSummary> {
    return this.http.get<TeamMatchAttendanceSummary>(
      `${this.API_URL}/teams/${teamId}/matches/${matchId}/attendance/summary`
    );
  }

  setMatchAttendanceStatus(
    teamId: number,
    matchId: number,
    userId: number,
    status: 'ATTENDING' | 'NOT_ATTENDING' | 'PENDING'
  ): Observable<TeamMatchAttendanceSummary> {
    return this.http.put<TeamMatchAttendanceSummary>(
      `${this.API_URL}/teams/${teamId}/matches/${matchId}/attendance/${userId}`,
      { status }
    );
  }

  createMatch(teamId: number, matchData: CreateTeamMatchRequest): Observable<TeamMatch> {
    return this.http.post<TeamMatch>(`${this.API_URL}/teams/${teamId}/matches`, matchData);
  }

  updateMatch(matchId: number, matchData: Partial<TeamMatch>): Observable<TeamMatch> {
    return this.http.put<TeamMatch>(`${this.API_URL}/teams/matches/${matchId}`, matchData);
  }

  deleteMatch(matchId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/teams/matches/${matchId}`);
  }

  confirmMatchAttendance(teamId: number, matchId: number, attending: boolean): Observable<void> {
    return this.http.post<void>(
      `${this.API_URL}/teams/${teamId}/matches/${matchId}/attendance`,
      {},
      { params: { attending: attending ? 'true' : 'false' } }
    );
  }

  // ==========================================
  // MATCH ADMIN: EQUIPOS DEL PARTIDO (MATCH TEAMS)
  // ==========================================

  getMatchTeams(teamId: number, matchId: number): Observable<MatchTeam[]> {
    return this.http.get<MatchTeam[]>(`${this.API_URL}/teams/${teamId}/matches/${matchId}/teams`);
  }

  createMatchTeam(teamId: number, matchId: number, team: { name: string; color: string }): Observable<MatchTeam> {
    return this.http.post<MatchTeam>(`${this.API_URL}/teams/${teamId}/matches/${matchId}/teams`, team);
  }

  createMatchTeamsBulk(
    teamId: number,
    matchId: number,
    teams: Array<{ name: string; color: string }>
  ): Observable<unknown> {
    return this.http.post<unknown>(`${this.API_URL}/teams/${teamId}/matches/${matchId}/teams/bulk`, { teams });
  }

  notifyMatchTeams(teamId: number, matchId: number): Observable<MatchNotifyResponse> {
    return this.http.post<MatchNotifyResponse>(`${this.API_URL}/teams/${teamId}/matches/${matchId}/teams/notify`, {});
  }

  // ==========================================
  // MATCH RESULT (GOLES / AUTOGOLES)
  // ==========================================

  getMatchResult(teamId: number, matchId: number): Observable<TeamMatchResult> {
    return this.http.get<TeamMatchResult>(`${this.API_URL}/teams/${teamId}/matches/${matchId}/result`);
  }

  upsertMatchResult(teamId: number, matchId: number, payload: TeamMatchResultUpsertRequest): Observable<TeamMatchResult> {
    return this.http.put<TeamMatchResult>(`${this.API_URL}/teams/${teamId}/matches/${matchId}/result`, payload);
  }

  notifyMatchResult(teamId: number, matchId: number): Observable<MatchNotifyResponse> {
    return this.http.post<MatchNotifyResponse>(`${this.API_URL}/teams/${teamId}/matches/${matchId}/result/notify`, {});
  }

  getMatchPlayerHistoricalStats(teamId: number, limit = 50): Observable<unknown> {
    return this.http.get<unknown>(`${this.API_URL}/teams/${teamId}/matches/stats/players`, { params: { limit } });
  }

  updateMatchTeam(
    teamId: number,
    matchId: number,
    matchTeamId: number,
    team: { name: string; color: string }
  ): Observable<MatchTeam> {
    return this.http.put<MatchTeam>(`${this.API_URL}/teams/${teamId}/matches/${matchId}/teams/${matchTeamId}`, team);
  }

  deleteMatchTeam(teamId: number, matchId: number, matchTeamId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/teams/${teamId}/matches/${matchId}/teams/${matchTeamId}`);
  }

  assignPlayerToMatchTeam(
    teamId: number,
    matchId: number,
    matchTeamId: number,
    userId: number,
    position: PlayerPosition
  ): Observable<unknown> {
    return this.http.put<unknown>(
      `${this.API_URL}/teams/${teamId}/matches/${matchId}/teams/${matchTeamId}/players/${userId}`,
      { position }
    );
  }

  removePlayerFromMatchTeam(teamId: number, matchId: number, matchTeamId: number, userId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.API_URL}/teams/${teamId}/matches/${matchId}/teams/${matchTeamId}/players/${userId}`
    );
  }
}
