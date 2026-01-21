import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Page,
  Statistics,
  StatsMatchHistoryItem,
  StatsMatchTeamWinner,
  StatsTeamAccess,
  StatsTopScorer,
} from '../models/football.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {
  private readonly API_URL = environment.teamsApiUrl;
  private http = inject(HttpClient);

  /**
   * Obtener estadísticas generales
   */
  getOverview(): Observable<Statistics> {
    return this.http.get<Statistics>(`${this.API_URL}/statistics/overview`);
  }

  /**
   * Obtener estadísticas de un equipo
   */
  getTeamStats(teamId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/statistics/teams/${teamId}`);
  }

  /**
   * Obtener estadísticas de un jugador
   */
  getPlayerStats(playerId: number): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/statistics/players/${playerId}`);
  }

  /**
   * Obtener top goleadores
   */
  getTopScorers(limit: number = 10): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/statistics/top-scorers?limit=${limit}`);
  }

  /**
   * Obtener equipos con más victorias
   */
  getTopTeams(limit: number = 10): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/statistics/top-teams?limit=${limit}`);
  }

  // ==========================================
  // NUEVO: ESTADÍSTICAS (MENÚ LATERAL)
  // ==========================================

  /**
   * Equipos disponibles para estadísticas
   * GET /api/stats/teams
   */
  getStatsTeams(): Observable<StatsTeamAccess[]> {
    return this.http.get<StatsTeamAccess[]>(`${this.API_URL}/stats/teams`);
  }

  /**
   * Años disponibles con partidos finalizados
   * GET /api/teams/{teamId}/stats/years
   */
  getTeamStatsYears(teamId: number): Observable<number[]> {
    return this.http.get<number[]>(`${this.API_URL}/teams/${teamId}/stats/years`);
  }

  /**
   * Meses disponibles en un año (1-12)
   * GET /api/teams/{teamId}/stats/months?year=YYYY
   */
  getTeamStatsMonths(teamId: number, year: number): Observable<number[]> {
    return this.http.get<number[]>(`${this.API_URL}/teams/${teamId}/stats/months`, {
      params: { year },
    });
  }

  /**
   * Histórico de marcadores por año/mes (paginado)
   * GET /api/teams/{teamId}/stats/matches?year=YYYY&month=MM&page=0&size=20
   */
  getTeamStatsMatches(
    teamId: number,
    params: { year: number; month?: number | null; page?: number; size?: number }
  ): Observable<Page<StatsMatchHistoryItem>> {
    const httpParams: Record<string, string> = {
      year: String(params.year),
      page: String(params.page ?? 0),
      size: String(params.size ?? 20),
    };

    if (params.month != null) {
      httpParams['month'] = String(params.month);
    }

    return this.http.get<Page<StatsMatchHistoryItem>>(`${this.API_URL}/teams/${teamId}/stats/matches`, {
      params: httpParams,
    });
  }

  /**
   * Top goleadores por período
   * GET /api/teams/{teamId}/stats/top-scorers?year=YYYY&month=MM&limit=20
   */
  getTeamTopScorers(
    teamId: number,
    params: { year: number; month?: number | null; limit?: number }
  ): Observable<StatsTopScorer[]> {
    const httpParams: Record<string, string> = {
      year: String(params.year),
      limit: String(params.limit ?? 20),
    };

    if (params.month != null) {
      httpParams['month'] = String(params.month);
    }

    return this.http.get<StatsTopScorer[]>(`${this.API_URL}/teams/${teamId}/stats/top-scorers`, {
      params: httpParams,
    });
  }

  /**
   * Leaderboard de equipos del partido con más victorias
   * GET /api/teams/{teamId}/stats/match-teams/winners?year=YYYY&month=MM
   */
  getMatchTeamWinners(
    teamId: number,
    params: { year: number; month?: number | null }
  ): Observable<StatsMatchTeamWinner[]> {
    const httpParams: Record<string, string> = {
      year: String(params.year),
    };

    if (params.month != null) {
      httpParams['month'] = String(params.month);
    }

    return this.http.get<StatsMatchTeamWinner[]>(`${this.API_URL}/teams/${teamId}/stats/match-teams/winners`, {
      params: httpParams,
    });
  }
}
