import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { TeamService } from '../../../services/team.service';
import { PollService } from '../../../services/poll.service';
import { MatchService } from '../../../services/match.service';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="home-container">
      <div class="welcome-section">
        <h1>¡Bienvenido, {{ user?.firstName }}! 👋</h1>
        <p>Gestiona todo tu ecosistema futbolístico desde un solo lugar</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-content">
            <h3>{{ stats.teams }}</h3>
            <p>Grupos</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏃</div>
          <div class="stat-content">
            <h3>{{ stats.players }}</h3>
            <p>Jugadores</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⚽</div>
          <div class="stat-content">
            <h3>{{ stats.matches }}</h3>
            <p>Partidos</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🎰</div>
          <div class="stat-content">
            <h3>{{ stats.polls }}</h3>
            <p>Pollas Activas</p>
          </div>
        </div>
      </div>

      <div class="quick-actions">
        <h2>Acciones Rápidas</h2>
        <div class="actions-grid">
          <a routerLink="/dashboard/teams" class="action-card">
            <span class="action-icon">➡️</span>
            <h3>Crear Grupo</h3>
            <p>Agrega un nuevo grupo a tu sistema</p>
          </a>
          <a routerLink="/dashboard/players" class="action-card">
            <span class="action-icon">🏃</span>
            <h3>Registrar Jugador</h3>
            <p>Añade jugadores a tus equipos</p>
          </a>
          <a routerLink="/dashboard/matches" class="action-card">
            <span class="action-icon">⚽</span>
            <h3>Programar Partido</h3>
            <p>Crea un nuevo partido</p>
          </a>
          <a routerLink="/dashboard/polls" class="action-card">
            <span class="action-icon">🎰</span>
            <h3>Nueva Polla</h3>
            <p>Crea una polla futbolística</p>
          </a>
        </div>
      </div>

      <div class="info-section">
        <div class="info-card">
          <h3>📊 Panel de Control</h3>
          <p>Este es tu centro de comando para gestionar todo relacionado con tu organización futbolística.</p>
          <ul>
            <li>Administra grupos y jugadores</li>
            <li>Programa y consulta partidos</li>
            <li>Crea y gestiona pollas futbolísticas</li>
            <li>Visualiza estadísticas detalladas</li>
          </ul>
        </div>
        
        <div class="info-card">
          <h3>🎯 Próximamente</h3>
          <ul>
            <li>Sistema de notificaciones en tiempo real</li>
            <li>Integración con redes sociales</li>
            <li>Reportes avanzados y análisis</li>
            <li>App móvil nativa</li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .welcome-section {
      margin-bottom: 40px;
    }

    .welcome-section h1 {
      font-size: 36px;
      color: var(--dark-color);
      margin-bottom: 8px;
      font-weight: 700;
    }

    .welcome-section p {
      font-size: 18px;
      color: var(--gray-color);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;
      margin-bottom: 48px;
    }

    .stat-card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      border: 1px solid var(--border-color);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }

    .stat-icon {
      font-size: 48px;
      flex-shrink: 0;
    }

    .stat-content h3 {
      font-size: 32px;
      font-weight: 700;
      color: var(--primary-color);
      margin: 0 0 4px 0;
    }

    .stat-content p {
      font-size: 14px;
      color: var(--gray-color);
      margin: 0;
    }

    .quick-actions h2 {
      font-size: 24px;
      color: var(--dark-color);
      margin-bottom: 24px;
      font-weight: 700;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      margin-bottom: 48px;
    }

    .action-card {
      background: white;
      border-radius: 16px;
      padding: 32px;
      text-align: center;
      text-decoration: none;
      border: 2px solid var(--border-color);
      transition: all 0.3s;
      cursor: pointer;
    }

    .action-card:hover {
      border-color: var(--primary-color);
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(34, 197, 94, 0.15);
    }

    .action-icon {
      font-size: 48px;
      display: block;
      margin-bottom: 16px;
    }

    .action-card h3 {
      font-size: 18px;
      color: var(--dark-color);
      margin-bottom: 8px;
      font-weight: 600;
    }

    .action-card p {
      font-size: 14px;
      color: var(--gray-color);
      margin: 0;
    }

    .info-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 24px;
    }

    .info-card {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(249, 115, 22, 0.05) 100%);
      border-radius: 16px;
      padding: 32px;
      border-left: 4px solid var(--primary-color);
    }

    .info-card h3 {
      font-size: 20px;
      color: var(--dark-color);
      margin-bottom: 16px;
      font-weight: 700;
    }

    .info-card p {
      color: var(--dark-color);
      line-height: 1.6;
      margin-bottom: 16px;
    }

    .info-card ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .info-card li {
      padding: 8px 0;
      color: var(--dark-color);
      display: flex;
      align-items: center;
    }

    .info-card li::before {
      content: '⚽';
      margin-right: 12px;
      font-size: 16px;
    }

    @media (max-width: 768px) {
      .welcome-section h1 {
        font-size: 28px;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .actions-grid {
        grid-template-columns: 1fr;
      }

      .info-section {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class HomeComponent implements OnInit {
  private authService = inject(AuthService);
  private teamService = inject(TeamService);
  private pollService = inject(PollService);
  private matchService = inject(MatchService);
  user: User | null = null;

  stats = {
    teams: 0,
    players: 0,
    matches: 0,
    polls: 0
  };

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
    });
    this.loadStats();
  }

  loadStats(): void {
    // Cargar grupos
    this.teamService.getAll().subscribe({
      next: (teams) => {
        this.stats.teams = teams.length;
      },
      error: (error) => console.error('Error loading teams:', error)
    });

    // Cargar partidos (todos los partidos)
    this.matchService.getAll().subscribe({
      next: (matches) => {
        this.stats.matches = matches.length;
      },
      error: (error) => console.error('Error loading matches:', error)
    });

    // Cargar pollas (usar endpoint de mis pollas para evitar /pollas/ que falla en algunos entornos)
    this.pollService.getMyPolls().subscribe({
      next: (polls) => {
        this.stats.polls = (polls || []).length;
      },
      error: (error) => {
        console.error('Error loading my polls (fallback):', error);
        this.stats.polls = 0;
      }
    });
  }
}
