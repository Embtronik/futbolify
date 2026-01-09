import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { FootballTeam, FootballLeague, FootballFixture } from '../models/football.model';
import { environment } from '../../environments/environment';


@Injectable({
  providedIn: 'root'
})


/**
 * Servicio para consumir TheSportsDB API (100% gratuita)
 * Documentación: https://www.thesportsdb.com/api.php
 * 
 * NOTA: TheSportsDB es completamente gratuita:
 * - Sin límites de requests
 * - Sin necesidad de API key
 * - Sin restricciones CORS
 * - Datos de ligas, equipos y partidos
 */
@Injectable({
  providedIn: 'root'
})
export class FootballApiService {
  // API-Football a través de proxy local (evita CORS)
  private readonly API_URL = '/api/football';
  
  private http = inject(HttpClient);

    /**
     * Obtener la temporada activa de una liga
     * API-Football: /leagues?id={leagueId}
     */
    getActiveSeason(leagueId: number): Observable<number | undefined> {
      const url = `${this.API_URL}/leagues?id=${leagueId}`;
      return this.http.get<any>(url).pipe(
        map((response: any) => {
          if (response && response.response && response.response[0] && Array.isArray(response.response[0].seasons)) {
            const seasons = response.response[0].seasons;
            const active = seasons.find((s: any) => s.current === true);
            return active?.year;
          }
          return undefined;
        })
      );
    }
  /**
   * Buscar equipos por nombre (solo para fallback)
   */
  searchTeams(query: string): Observable<FootballTeam[]> {
    return of(this.getMockTeams().filter(team => 
      team.name.toLowerCase().includes(query.toLowerCase())
    ));
  }

  /**
   * Obtener equipos de una liga específica
   * TheSportsDB: /api/v1/json/3/lookup_all_teams.php?id={leagueId}
   */
  getTeamsByLeague(leagueId: number, season: number = 2024): Observable<FootballTeam[]> {
    const url = `${this.API_URL}/lookup_all_teams.php?id=${leagueId}`;
    
    return this.http.get<any>(url).pipe(
      map(response => {
        if (response.teams && Array.isArray(response.teams)) {
          return response.teams.map((team: any) => ({
            id: parseInt(team.idTeam),
            name: team.strTeam,
            logo: team.strBadge || team.strTeamBadge || '',
            country: team.strCountry || '',
            founded: parseInt(team.intFormedYear) || undefined,
            national: false
          }));
        }
        return this.getMockTeams();
      }),
      catchError(error => {
        return of(this.getMockTeams());
      })
    );
  }

  /**
   * Obtener temporadas disponibles
   * API-Football: /leagues/seasons
   */
  getAvailableSeasons(): Observable<number[]> {
    const url = `${this.API_URL}/leagues/seasons`;
    
    
    return this.http.get<any>(url).pipe(
      map(response => {
        
        if (response && response.response && Array.isArray(response.response)) {
          const seasons = response.response.sort((a: number, b: number) => b - a); // Ordenar descendente
          return seasons;
        }
        
        return [new Date().getFullYear()];
      }),
      catchError(error => {
        return of([new Date().getFullYear()]);
      })
    );
  }

  /**
   * Obtener ligas/competiciones disponibles
   * API-Football: /leagues
   */
  getLeagues(): Observable<FootballLeague[]> {
    const url = `${this.API_URL}/leagues`;
    return this.http.get<any>(url).pipe(
      map(response => {
        if (!response || !response.response || !Array.isArray(response.response)) {
          return this.getMockLeagues();
        }
        // Mapear todas las ligas disponibles (sin año)
        const leagues = response.response.map((item: any) => ({
          id: item.league.id,
          name: item.league.name,
          country: item.country.name,
          logo: item.league.logo
        }));
        return leagues;
      }),
      catchError(error => {
        return of(this.getMockLeagues());
      })
    );
  }

  /**
   * Obtener próximos partidos de una liga desde la fecha actual
   * API-Football: /fixtures?league={leagueId}&season={season}&from={today}&timezone={timezone}
   */
  getUpcomingFixtures(leagueId: number, season?: number): Observable<FootballFixture[]> {
    const currentYear = season || new Date().getFullYear();
    // Usar el parámetro 'next=20' como en el ejemplo de Postman
    const url = `${this.API_URL}/fixtures?league=${leagueId}&season=${currentYear}&next=20`;

    return this.http.get<any>(url).pipe(
      map(response => {

        if (!response || !response.response || !Array.isArray(response.response) || response.response.length === 0) {
          console.warn('⚠️ No se encontraron partidos, usando mock');
          return this.getMockFixturesByLeague(leagueId);
        }

        const fixtures = response.response
          .slice(0, 20) // Limitar a 20 partidos próximos
          .map((item: any) => ({
            fixture: {
              id: item.fixture.id,
              date: item.fixture.date,
              timestamp: item.fixture.timestamp,
              venue: {
                name: item.fixture.venue?.name || 'Por definir',
                city: item.fixture.venue?.city || 'Por definir'
              },
              status: {
                short: item.fixture.status.short,
                long: item.fixture.status.long
              }
            },
            league: {
              id: item.league.id,
              name: item.league.name,
              country: item.league.country,
              logo: item.league.logo,
              season: item.league.season
            },
            teams: {
              home: {
                id: item.teams.home.id,
                name: item.teams.home.name,
                logo: item.teams.home.logo
              },
              away: {
                id: item.teams.away.id,
                name: item.teams.away.name,
                logo: item.teams.away.logo
              }
            },
            goals: {
              home: item.goals?.home,
              away: item.goals?.away
            }
          }));

        console.log('✅ Partidos encontrados:', fixtures.length);
        return fixtures;
      }),
      catchError(error => {
        console.error('❌ Error obteniendo fixtures:', error);
        return of(this.getMockFixturesByLeague(leagueId));
      })
    );
  }

  /**
   * Buscar partidos próximos de un equipo específico
   * TheSportsDB: /api/v1/json/3/eventsnext.php?id={teamId}
   */
  getUpcomingMatches(teamId: number, limit: number = 10): Observable<FootballFixture[]> {
    const url = `${this.API_URL}/eventsnext.php?id=${teamId}`;
    
    return this.http.get<any>(url).pipe(
      map(response => {
        if (response.events && Array.isArray(response.events)) {
          return response.events.slice(0, limit);
        }
        return this.getMockFixtures(teamId);
      }),
      catchError(() => of(this.getMockFixtures(teamId)))
    );
  }

  /**
   * Equipos mock para desarrollo
   * Incluye equipos populares de diferentes ligas
   */
  private getMockTeams(): FootballTeam[] {
    return [
      // La Liga (España)
      {
        id: 529,
        name: 'FC Barcelona',
        logo: 'https://media.api-sports.io/football/teams/529.png',
        country: 'Spain',
        founded: 1899,
        national: false
      },
      {
        id: 541,
        name: 'Real Madrid',
        logo: 'https://media.api-sports.io/football/teams/541.png',
        country: 'Spain',
        founded: 1902,
        national: false
      },
      {
        id: 530,
        name: 'Atlético Madrid',
        logo: 'https://media.api-sports.io/football/teams/530.png',
        country: 'Spain',
        founded: 1903,
        national: false
      },
      {
        id: 532,
        name: 'Valencia',
        logo: 'https://media.api-sports.io/football/teams/532.png',
        country: 'Spain',
        founded: 1919,
        national: false
      },
      {
        id: 536,
        name: 'Sevilla',
        logo: 'https://media.api-sports.io/football/teams/536.png',
        country: 'Spain',
        founded: 1890,
        national: false
      },

      // Premier League (Inglaterra)
      {
        id: 33,
        name: 'Manchester United',
        logo: 'https://media.api-sports.io/football/teams/33.png',
        country: 'England',
        founded: 1878,
        national: false
      },
      {
        id: 40,
        name: 'Liverpool',
        logo: 'https://media.api-sports.io/football/teams/40.png',
        country: 'England',
        founded: 1892,
        national: false
      },
      {
        id: 50,
        name: 'Manchester City',
        logo: 'https://media.api-sports.io/football/teams/50.png',
        country: 'England',
        founded: 1880,
        national: false
      },
      {
        id: 49,
        name: 'Chelsea',
        logo: 'https://media.api-sports.io/football/teams/49.png',
        country: 'England',
        founded: 1905,
        national: false
      },
      {
        id: 42,
        name: 'Arsenal',
        logo: 'https://media.api-sports.io/football/teams/42.png',
        country: 'England',
        founded: 1886,
        national: false
      },

      // Serie A (Italia)
      {
        id: 489,
        name: 'AC Milan',
        logo: 'https://media.api-sports.io/football/teams/489.png',
        country: 'Italy',
        founded: 1899,
        national: false
      },
      {
        id: 496,
        name: 'Juventus',
        logo: 'https://media.api-sports.io/football/teams/496.png',
        country: 'Italy',
        founded: 1897,
        national: false
      },
      {
        id: 497,
        name: 'Inter',
        logo: 'https://media.api-sports.io/football/teams/497.png',
        country: 'Italy',
        founded: 1908,
        national: false
      },
      {
        id: 487,
        name: 'AS Roma',
        logo: 'https://media.api-sports.io/football/teams/487.png',
        country: 'Italy',
        founded: 1927,
        national: false
      },

      // Bundesliga (Alemania)
      {
        id: 157,
        name: 'Bayern Munich',
        logo: 'https://media.api-sports.io/football/teams/157.png',
        country: 'Germany',
        founded: 1900,
        national: false
      },
      {
        id: 165,
        name: 'Borussia Dortmund',
        logo: 'https://media.api-sports.io/football/teams/165.png',
        country: 'Germany',
        founded: 1909,
        national: false
      },

      // Ligue 1 (Francia)
      {
        id: 85,
        name: 'Paris Saint Germain',
        logo: 'https://media.api-sports.io/football/teams/85.png',
        country: 'France',
        founded: 1970,
        national: false
      },
      {
        id: 91,
        name: 'Monaco',
        logo: 'https://media.api-sports.io/football/teams/91.png',
        country: 'France',
        founded: 1924,
        national: false
      },

      // Liga Colombiana
      {
        id: 1149,
        name: 'Atlético Nacional',
        logo: 'https://media.api-sports.io/football/teams/1149.png',
        country: 'Colombia',
        founded: 1947,
        national: false
      },
      {
        id: 1141,
        name: 'Millonarios',
        logo: 'https://media.api-sports.io/football/teams/1141.png',
        country: 'Colombia',
        founded: 1946,
        national: false
      },
      {
        id: 1159,
        name: 'América de Cali',
        logo: 'https://media.api-sports.io/football/teams/1159.png',
        country: 'Colombia',
        founded: 1927,
        national: false
      },
      {
        id: 1140,
        name: 'Deportivo Cali',
        logo: 'https://media.api-sports.io/football/teams/1140.png',
        country: 'Colombia',
        founded: 1912,
        national: false
      },

      // Selecciones Nacionales
      {
        id: 26,
        name: 'Colombia',
        logo: 'https://media.api-sports.io/football/teams/26.png',
        country: 'Colombia',
        national: true
      },
      {
        id: 6,
        name: 'Brazil',
        logo: 'https://media.api-sports.io/football/teams/6.png',
        country: 'Brazil',
        national: true
      },
      {
        id: 1,
        name: 'Argentina',
        logo: 'https://media.api-sports.io/football/teams/1.png',
        country: 'Argentina',
        national: true
      },
      {
        id: 9,
        name: 'Spain',
        logo: 'https://media.api-sports.io/football/teams/9.png',
        country: 'Spain',
        national: true
      },
      {
        id: 10,
        name: 'England',
        logo: 'https://media.api-sports.io/football/teams/10.png',
        country: 'England',
        national: true
      },
      {
        id: 2,
        name: 'France',
        logo: 'https://media.api-sports.io/football/teams/2.png',
        country: 'France',
        national: true
      },
      {
        id: 25,
        name: 'Germany',
        logo: 'https://media.api-sports.io/football/teams/25.png',
        country: 'Germany',
        national: true
      },
      {
        id: 768,
        name: 'Italy',
        logo: 'https://media.api-sports.io/football/teams/768.png',
        country: 'Italy',
        national: true
      }
    ];
  }

  /**
   * Ligas mock para desarrollo
   */
  private getMockLeagues(): FootballLeague[] {
    const currentYear = new Date().getFullYear();
    return [
      {
        id: 39,
        name: 'Premier League',
        country: 'England',
        logo: 'https://media.api-sports.io/football/leagues/39.png'
      },
      {
        id: 140,
        name: 'La Liga',
        country: 'Spain',
        logo: 'https://media.api-sports.io/football/leagues/140.png'
      },
      {
        id: 135,
        name: 'Serie A',
        country: 'Italy',
        logo: 'https://media.api-sports.io/football/leagues/135.png'
      },
      {
        id: 78,
        name: 'Bundesliga',
        country: 'Germany',
        logo: 'https://media.api-sports.io/football/leagues/78.png'
      },
      {
        id: 61,
        name: 'Ligue 1',
        country: 'France',
        logo: 'https://media.api-sports.io/football/leagues/61.png'
      },
      {
        id: 239,
        name: 'Liga BetPlay',
        country: 'Colombia',
        logo: 'https://media.api-sports.io/football/leagues/239.png'
      },
      {
        id: 1,
        name: 'World Cup',
        country: 'World',
        logo: 'https://media.api-sports.io/football/leagues/1.png'
      },
      {
        id: 2,
        name: 'UEFA Champions League',
        country: 'Europe',
        logo: 'https://media.api-sports.io/football/leagues/2.png'
      },
      {
        id: 9,
        name: 'Copa América',
        country: 'South America',
        logo: 'https://media.api-sports.io/football/leagues/9.png'
      }
    ];
  }

  /**
   * Partidos mock para desarrollo por liga
   */
  private getMockFixturesByLeague(leagueId: number): FootballFixture[] {
    const today = new Date();
    const fixtures: FootballFixture[] = [];
    const teams = this.getMockTeams();
    const league = this.getMockLeagues().find(l => l.id === leagueId) || this.getMockLeagues()[0];

    // Generar 20 partidos
    for (let i = 0; i < 20; i++) {
      const matchDate = new Date(today);
      matchDate.setDate(today.getDate() + Math.floor(i / 2) * 3);
      
      const homeTeam = teams[i % teams.length];
      const awayTeam = teams[(i + 1) % teams.length];
      
      fixtures.push({
        fixture: {
          id: leagueId * 10000 + i,
          date: matchDate.toISOString(),
          timestamp: matchDate.getTime() / 1000,
          venue: {
            name: `Estadio ${homeTeam.name}`,
            city: homeTeam.country
          },
          status: { short: 'NS', long: 'Not Started' }
        },
        league: {
          id: league.id,
          name: league.name,
          country: league.country,
          logo: league.logo,
          // season eliminado, ya no existe en FootballLeague
        },
        teams: {
          home: { id: homeTeam.id, name: homeTeam.name, logo: homeTeam.logo },
          away: { id: awayTeam.id, name: awayTeam.name, logo: awayTeam.logo }
        }
      });
    }
    return fixtures;
  }

  /**
   * Partidos mock para desarrollo
   * Genera partidos próximos ficticios para un equipo
   */
  private getMockFixtures(teamId: number): FootballFixture[] {
    const today = new Date();
    const fixtures: FootballFixture[] = [];
    
    // Buscar el equipo
    const team = this.getMockTeams().find(t => t.id === teamId);
    if (!team) return [];

    // Generar 5 partidos próximos
    for (let i = 0; i < 5; i++) {
      const matchDate = new Date(today);
      matchDate.setDate(today.getDate() + (i * 7) + 3); // Cada semana

      // Seleccionar rival aleatorio
      const allTeams = this.getMockTeams();
      const opponent = allTeams[Math.floor(Math.random() * allTeams.length)];
      
      const isHome = i % 2 === 0;
      
      fixtures.push({
        fixture: {
          id: 1000000 + teamId * 100 + i,
          date: matchDate.toISOString(),
          timestamp: matchDate.getTime() / 1000,
          venue: {
            name: isHome ? `Estadio ${team.name}` : `Estadio ${opponent.name}`,
            city: team.country
          },
          status: {
            short: 'NS',
            long: 'Not Started'
          }
        },
        league: {
          id: 140,
          name: 'La Liga',
          country: team.country,
          logo: 'https://media.api-sports.io/football/leagues/140.png',
          season: 2025
        },
        teams: {
          home: isHome ? {
            id: team.id,
            name: team.name,
            logo: team.logo
          } : {
            id: opponent.id,
            name: opponent.name,
            logo: opponent.logo
          },
          away: isHome ? {
            id: opponent.id,
            name: opponent.name,
            logo: opponent.logo
          } : {
            id: team.id,
            name: team.name,
            logo: team.logo
          }
        }
      });
    }

    return fixtures;
  }
}
