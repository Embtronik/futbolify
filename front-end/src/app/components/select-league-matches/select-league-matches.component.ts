import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FootballApiService } from '../../services/football-api.service';
import { FootballLeague, FootballFixture } from '../../models/football.model';
import { Observable, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-select-league-matches',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [DatePipe],
  templateUrl: './select-league-matches.component.html',
  styleUrls: ['./select-league-matches.component.css']
})
export class SelectLeagueMatchesComponent implements OnInit {
  leagues: FootballLeague[] = [];
  selectedLeagueId: number | null = null;
  fixtures: FootballFixture[] = [];
  loadingLeagues = false;
  loadingFixtures = false;
  errorLeagues: string | null = null;
  errorFixtures: string | null = null;
  noFixtures = false;

  constructor(private footballApi: FootballApiService) {}

  ngOnInit(): void {
    this.loadLeagues();
  }

  loadLeagues(): void {
    this.loadingLeagues = true;
    this.errorLeagues = null;
    this.footballApi.getLeagues()
      .pipe(
        finalize(() => this.loadingLeagues = false),
        catchError(err => {
          this.errorLeagues = 'Error cargando ligas.';
          return of([]);
        })
      )
      .subscribe(leagues => {
        this.leagues = leagues;
      });
  }

  onLeagueChange(): void {
    if (this.selectedLeagueId) {
      this.loadingFixtures = true;
      this.errorFixtures = null;
      this.noFixtures = false;
      this.fixtures = [];
      // Buscar temporada activa antes de buscar partidos
      this.footballApi.getActiveSeason(this.selectedLeagueId).pipe(
        catchError(err => {
          this.errorFixtures = 'No se pudo obtener la temporada activa.';
          this.loadingFixtures = false;
          return of(undefined);
        })
      ).subscribe(season => {
        if (!season) {
          this.errorFixtures = 'No se encontró temporada activa para esta liga.';
          this.loadingFixtures = false;
          return;
        }
        this.footballApi.getUpcomingFixtures(this.selectedLeagueId!, season)
          .pipe(
            finalize(() => this.loadingFixtures = false),
            catchError(err => {
              this.errorFixtures = 'Error cargando partidos.';
              return of([]);
            })
          )
          .subscribe(fixtures => {
            // Agregar propiedad 'selected' a cada fixture para selección múltiple
            this.fixtures = fixtures
              .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime())
              .map(f => ({ ...f, selected: false }));
            this.noFixtures = this.fixtures.length === 0;
          });
      });
    } else {
      this.fixtures = [];
      this.noFixtures = false;
      this.errorFixtures = null;
    }
  }
}
