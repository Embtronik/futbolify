import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-matches',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="matches-container">
      <div class="page-header">
        <h1>Gestión de Partidos</h1>
        <button class="btn btn-primary">
          <span>➕</span> Programar Partido
        </button>
      </div>

      <div class="empty-state">
        <div class="empty-icon">⚽</div>
        <h2>No tienes partidos programados</h2>
        <p>Organiza partidos entre tus equipos</p>
        <button class="btn btn-primary">Crear primer partido</button>
      </div>
    </div>
  `,
  styles: [`
    .matches-container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
    }

    .page-header h1 {
      font-size: 32px;
      font-weight: 700;
      color: var(--dark-color);
      margin: 0;
    }

    .empty-state {
      background: white;
      border-radius: 16px;
      padding: 80px 40px;
      text-align: center;
      border: 2px dashed var(--border-color);
    }

    .empty-icon {
      font-size: 80px;
      margin-bottom: 24px;
    }

    .empty-state h2 {
      font-size: 24px;
      color: var(--dark-color);
      margin-bottom: 12px;
    }

    .empty-state p {
      font-size: 16px;
      color: var(--gray-color);
      margin-bottom: 32px;
    }
  `]
})
export class MatchesComponent {}
