import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Poll,
  PollParticipant,
  PollMatch,
  PollPrediction,
  CreatePollRequest,
  AddPollMatchRequest,
  CreatePredictionRequest,
  PollInvitation
} from '../models/football.model';
import { environment } from '../../environments/environment';

/**
 * Servicio para gestión de pollas (apuestas de marcadores)
 */
@Injectable({
  providedIn: 'root'
})
export class PollService {
  private readonly API_URL = environment.teamsApiUrl;
  private http = inject(HttpClient);

  // ==========================================
  // GESTIÓN DE POLLAS
  // ==========================================

  /**
   * Crear una nueva polla
   * POST /pollas
   */
  createPoll(pollData: CreatePollRequest): Observable<Poll> {
    console.log('🔵 PollService.createPoll - Datos recibidos:', pollData);
    console.log('🔵 PollService.createPoll - JSON:', JSON.stringify(pollData));
    return this.http.post<Poll>(`${this.API_URL}/pollas`, pollData);
  }

  /**
   * Obtener pollas donde el usuario es creador o participante
   * GET /pollas/mis-pollas
   */
  getMyPolls(): Observable<Poll[]> {
    return this.http.get<Poll[]>(`${this.API_URL}/pollas/mis-pollas`);
  }

  /**
   * Obtener detalle completo de una polla
   * GET /pollas/{id}
   */
  getPollById(pollId: number): Observable<Poll> {
    return this.http.get<Poll>(`${this.API_URL}/pollas/${pollId}`);
  }

  /**
   * Actualizar una polla (solo creador)
   * PUT /pollas/{id}
   */
  updatePoll(pollId: number, pollData: Partial<Poll>): Observable<Poll> {
    return this.http.put<Poll>(`${this.API_URL}/pollas/${pollId}`, pollData);
  }

  /**
   * Eliminar una polla (solo creador)
   * DELETE /pollas/{id}
   */
  deletePoll(pollId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/pollas/${pollId}`);
  }

  // ==========================================
  // GESTIÓN DE INVITACIONES
  // ==========================================

  /**
   * Enviar invitaciones a miembros de grupos
   * POST /pollas/{id}/invitaciones
   */
  sendInvitations(pollId: number, emails: string[]): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/pollas/${pollId}/invitaciones`, { emails });
  }

  /**
   * Aceptar invitación a una polla
   * POST /pollas/{id}/aceptar
   */
  acceptInvitation(pollId: number): Observable<PollParticipant> {
    return this.http.post<PollParticipant>(`${this.API_URL}/pollas/${pollId}/aceptar`, {});
  }

  /**
   * Rechazar invitación a una polla
   * POST /pollas/{id}/rechazar
   */
  rejectInvitation(pollId: number): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/pollas/${pollId}/rechazar`, {});
  }

  /**
   * Obtener invitaciones pendientes del usuario
   * GET /pollas/invitaciones
   */
  getMyInvitations(): Observable<PollInvitation[]> {
    return this.http.get<PollInvitation[]>(`${this.API_URL}/pollas/invitaciones`);
  }

  /**
   * Obtener participantes de una polla
   * GET /pollas/{id}/participantes
   */
  getParticipants(pollId: number): Observable<PollParticipant[]> {
    return this.http.get<PollParticipant[]>(`${this.API_URL}/pollas/${pollId}/participantes`);
  }

  // ==========================================
  // GESTIÓN DE PARTIDOS
  // ==========================================

  /**
   * Agregar partidos a una polla
   * POST /pollas/{id}/partidos
   */
  addMatches(pollId: number, matches: AddPollMatchRequest[]): Observable<PollMatch[]> {
    return this.http.post<PollMatch[]>(`${this.API_URL}/pollas/${pollId}/partidos`, matches);
  }

  /**
   * Obtener partidos de una polla
   * GET /pollas/{id}/partidos
   */
  getMatches(pollId: number): Observable<PollMatch[]> {
    return this.http.get<PollMatch[]>(`${this.API_URL}/pollas/${pollId}/partidos`);
  }

  /**
   * Eliminar un partido de una polla
   * DELETE /pollas/{pollId}/partidos/{matchId}
   */
  deleteMatch(pollId: number, matchId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/pollas/${pollId}/partidos/${matchId}`);
  }

  // ==========================================
  // GESTIÓN DE PRONÓSTICOS
  // ==========================================

  /**
   * Registrar o actualizar pronóstico
   * POST /pollas/{id}/pronosticos
   */
  createOrUpdatePrediction(pollId: number, prediction: CreatePredictionRequest): Observable<PollPrediction> {
    return this.http.post<PollPrediction>(`${this.API_URL}/pollas/${pollId}/pronosticos`, prediction);
  }

  /**
   * Obtener pronósticos del usuario en una polla
   * GET /pollas/{id}/mis-pronosticos
   */
  getMyPredictions(pollId: number): Observable<PollPrediction[]> {
    return this.http.get<PollPrediction[]>(`${this.API_URL}/pollas/${pollId}/mis-pronosticos`);
  }

  /**
   * Obtener todos los pronósticos de un partido (solo después del límite)
   * GET /pollas/{pollId}/partidos/{matchId}/pronosticos
   */
  getMatchPredictions(pollId: number, matchId: number): Observable<PollPrediction[]> {
    return this.http.get<PollPrediction[]>(`${this.API_URL}/pollas/${pollId}/partidos/${matchId}/pronosticos`);
  }

  /**
   * Obtener tabla de posiciones de una polla
   * GET /pollas/{id}/ranking
   */
  getRanking(pollId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/pollas/${pollId}/ranking`);
  }

  // ==========================================
  // UTILIDADES
  // ==========================================

  /**
   * Verificar si un partido permite pronósticos
   * (debe ser antes del límite de 5 minutos)
   */
  canPredict(match: PollMatch): boolean {
    if (typeof (match as any)?.puedePronosticar === 'boolean') {
      return (match as any).puedePronosticar;
    }
    const now = new Date();
    const limitDate = new Date(match.fechaLimitePronostico);
    return now < limitDate;
  }

  /**
   * Calcular tiempo restante para pronosticar
   */
  getTimeUntilLimit(match: PollMatch): { hours: number; minutes: number; expired: boolean } {
    const now = new Date();
    const limitDate = new Date(match.fechaLimitePronostico);
    const diff = limitDate.getTime() - now.getTime();

    if (diff <= 0) {
      return { hours: 0, minutes: 0, expired: true };
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { hours, minutes, expired: false };
  }
}
