import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TeamService } from '../../../services/team.service';
import { Team, TeamMember, Player } from '../../../models/football.model';

@Component({
  selector: 'app-players',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="players-container">
      <div class="page-header">
        <h1>Gestión de Jugadores</h1>
        <button class="btn btn-primary" (click)="openCreateModal()">
          <span>➥</span> Registrar Jugador
        </button>
      </div>

      <!-- Lista de jugadores -->
      <div *ngIf="players.length > 0" class="players-grid">
        <div *ngFor="let player of players" class="player-card">
          <div class="player-photo">
            <img *ngIf="player.photo" [src]="player.photo" [alt]="player.firstName">
            <span *ngIf="!player.photo" class="default-photo">🏃</span>
          </div>
          <div class="player-info">
            <h3>{{ player.firstName }} {{ player.lastName }}</h3>
            <p class="player-position">{{ getPositionLabel(player.position) }}</p>
            <p class="player-team" *ngIf="player.teamName">
              👥 {{ player.teamName }}
            </p>
            <p class="player-number" *ngIf="player.jerseyNumber">
              #{{ player.jerseyNumber }}
            </p>
          </div>
        </div>
      </div>

      <!-- Estado vacío -->
      <div *ngIf="players.length === 0 && !loading" class="empty-state">
        <div class="empty-icon">🏃</div>
        <h2>No tienes jugadores registrados</h2>
        <p>Registra jugadores en tu grupo</p>
        <button class="btn btn-primary" (click)="openCreateModal()">
          Registrar Jugador
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Cargando jugadores...</p>
      </div>

      <!-- Modal para crear jugador -->
      <div class="modal-overlay" *ngIf="showCreateModal" (click)="closeCreateModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Registrar Nuevo Jugador</h2>
            <button class="close-btn" (click)="closeCreateModal()">✕</button>
          </div>

          <form [formGroup]="createForm" (ngSubmit)="createPlayer()">
            <div class="form-row">
              <div class="form-group">
                <label for="firstName">Nombre *</label>
                <input 
                  type="text" 
                  id="firstName" 
                  formControlName="firstName"
                  placeholder="Nombre del jugador"
                  class="form-control"
                >
              </div>
              <div class="form-group">
                <label for="lastName">Apellido *</label>
                <input 
                  type="text" 
                  id="lastName" 
                  formControlName="lastName"
                  placeholder="Apellido del jugador"
                  class="form-control"
                >
              </div>
            </div>

            <div class="form-group">
              <label for="position">Posición *</label>
              <select id="position" formControlName="position" class="form-control">
                <option value="">Selecciona una posición</option>
                <option value="GOALKEEPER">Portero</option>
                <option value="DEFENDER">Defensa</option>
                <option value="MIDFIELDER">Mediocampista</option>
                <option value="FORWARD">Delantero</option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="jerseyNumber">Número de Camiseta</label>
                <input 
                  type="number" 
                  id="jerseyNumber" 
                  formControlName="jerseyNumber"
                  placeholder="Ej: 10"
                  class="form-control"
                  min="1"
                  max="99"
                >
              </div>
              <div class="form-group">
                <label for="nationality">Nacionalidad</label>
                <input 
                  type="text" 
                  id="nationality" 
                  formControlName="nationality"
                  placeholder="Ej: Colombia"
                  class="form-control"
                >
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-outline" (click)="closeCreateModal()">
                Cancelar
              </button>
              <button 
                type="submit" 
                class="btn btn-primary" 
                [disabled]="createForm.invalid || creating"
              >
                {{ creating ? 'Registrando...' : 'Registrar Jugador' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .players-container {
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

    .header-actions {
      display: flex;
      gap: 12px;
    }

    .players-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }

    .player-card {
      background: white;
      border-radius: 16px;
      padding: 20px;
      border: 1px solid var(--border-color);
      text-align: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .player-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
    }

    .player-photo {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      margin: 0 auto 16px;
      overflow: hidden;
      background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .player-photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .default-photo {
      font-size: 48px;
    }

    .player-info h3 {
      font-size: 18px;
      color: var(--dark-color);
      margin: 0 0 8px 0;
      font-weight: 600;
    }

    .player-position {
      font-size: 14px;
      color: var(--primary-color);
      font-weight: 600;
      margin: 0 0 8px 0;
    }

    .player-team {
      font-size: 13px;
      color: var(--gray-color);
      margin: 0 0 4px 0;
    }

    .player-number {
      font-size: 24px;
      font-weight: 700;
      color: var(--dark-color);
      margin: 8px 0 0 0;
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

    .empty-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .loading-state {
      text-align: center;
      padding: 60px;
    }

    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid var(--border-color);
      border-top-color: var(--primary-color);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-content {
      background: white;
      border-radius: 20px;
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .modal-content.small {
      max-width: 500px;
    }

    .modal-header {
      padding: 24px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-header h2 {
      font-size: 24px;
      color: var(--dark-color);
      margin: 0;
      font-weight: 700;
    }

    .close-btn {
      background: transparent;
      border: none;
      font-size: 28px;
      cursor: pointer;
      color: var(--gray-color);
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: var(--light-color);
      color: var(--dark-color);
    }

    form {
      padding: 24px;
    }

    .join-content {
      text-align: center;
    }

    .icon-large {
      font-size: 80px;
      margin-bottom: 20px;
    }

    .join-description {
      color: var(--gray-color);
      margin-bottom: 32px;
      font-size: 15px;
    }

    .form-group {
      margin-bottom: 20px;
      text-align: left;
    }

    .form-group label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: var(--dark-color);
      margin-bottom: 8px;
    }

    .form-control {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid var(--border-color);
      border-radius: 12px;
      font-size: 15px;
      transition: border-color 0.2s;
      font-family: inherit;
    }

    .form-control:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    .code-input {
      text-align: center;
      font-size: 20px;
      font-weight: 700;
      text-transform: uppercase;
      font-family: 'Courier New', monospace;
      letter-spacing: 2px;
    }

    .error {
      display: block;
      color: #ef4444;
      font-size: 13px;
      margin-top: 6px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .modal-footer {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
    }

    @media (max-width: 768px) {
      .players-grid {
        grid-template-columns: 1fr;
      }

      .header-actions {
        flex-direction: column;
        width: 100%;
      }

      .header-actions button {
        width: 100%;
      }

      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PlayersComponent implements OnInit {
  private teamService = inject(TeamService);
  private fb = inject(FormBuilder);

  players: Player[] = [];
  loading = false;
  showCreateModal = false;
  creating = false;

  createForm: FormGroup = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    position: ['', Validators.required],
    jerseyNumber: [''],
    nationality: ['']
  });

  ngOnInit(): void {
    this.loadPlayers();
  }

  loadPlayers(): void {
    this.loading = true;
    this.teamService.getMyPlayers().subscribe({
      next: (players: Player[]) => {
        this.players = players;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading players:', error);
        this.loading = false;
      }
    });
  }

  openCreateModal(): void {
    this.showCreateModal = true;
    this.createForm.reset();
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  createPlayer(): void {
    if (this.createForm.invalid) return;

    this.creating = true;
    const playerData = this.createForm.value;

    this.teamService.registerPlayer(playerData).subscribe({
      next: (player) => {
        this.players.unshift(player);
        this.closeCreateModal();
        this.creating = false;
        alert('¡Jugador registrado exitosamente!');
      },
      error: (error) => {
        console.error('Error creating player:', error);
        alert('Error al registrar el jugador. Por favor intenta de nuevo.');
        this.creating = false;
      }
    });
  }

  getPositionLabel(position: string): string {
    const positions: { [key: string]: string } = {
      'GOALKEEPER': 'Portero',
      'DEFENDER': 'Defensa',
      'MIDFIELDER': 'Mediocampista',
      'FORWARD': 'Delantero'
    };
    return positions[position] || position;
  }
}
