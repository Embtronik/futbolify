import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Match } from '../models/football.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MatchService {
  private readonly API_URL = environment.apiUrl;
  private http = inject(HttpClient);

  /**
   * Obtener todos los partidos
   */
  getAll(): Observable<Match[]> {
    return this.http.get<Match[]>(`${this.API_URL}/matches`).pipe(
      catchError((err: any) => {
        if (err && err.status === 405) {
          console.error('GET /matches returned 405 Method Not Allowed. Verify backend mapping (@GetMapping).', err);
        } else {
          console.error('Error fetching matches:', err);
        }
        return of([] as Match[]);
      })
    );
  }

  /**
   * Obtener partidos por equipo
   */
  getByTeam(teamId: number): Observable<Match[]> {
    return this.http.get<Match[]>(`${this.API_URL}/matches/team/${teamId}`);
  }

  /**
   * Obtener un partido por ID
   */
  getById(id: number): Observable<Match> {
    return this.http.get<Match>(`${this.API_URL}/matches/${id}`);
  }

  /**
   * Crear un nuevo partido
   */
  create(match: Partial<Match>): Observable<Match> {
    return this.http.post<Match>(`${this.API_URL}/matches`, match);
  }

  /**
   * Actualizar un partido
   */
  update(id: number, match: Partial<Match>): Observable<Match> {
    return this.http.put<Match>(`${this.API_URL}/matches/${id}`, match);
  }

  /**
   * Actualizar el resultado de un partido
   */
  updateScore(id: number, homeScore: number, awayScore: number): Observable<Match> {
    return this.http.patch<Match>(`${this.API_URL}/matches/${id}/score`, {
      homeScore,
      awayScore
    });
  }

  /**
   * Eliminar un partido
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/matches/${id}`);
  }
}
