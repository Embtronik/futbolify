import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Statistics } from '../models/football.model';

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {
  private readonly API_URL = 'http://localhost:8080/api/v1';
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
}
