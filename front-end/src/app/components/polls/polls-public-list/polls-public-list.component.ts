import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PollService } from '../../../services/poll.service';
import { AuthService } from '../../../services/auth.service';
import { Poll } from '../../../models/football.model';

@Component({
  selector: 'app-polls-public-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="public-polls-container">
      <div class="header">
        <div>
          <h2>🌍 Pollas Públicas</h2>
          <p class="subtitle">Encuentra y participa en pollas abiertas a todos</p>
        </div>
        <button class="btn-my-polls" (click)="navigateToMyPolls()">
          Mis Pollas
        </button>
      </div>

      <!-- Filtros -->
      <div class="filters">
        <input 
          type="text" 
          [(ngModel)]="searchTerm" 
          placeholder="Buscar por nombre..." 
          class="search-input"
          (input)="filterPolls()">
        
        <select [(ngModel)]="filterStatus" class="filter-select" (change)="filterPolls()">
          <option value="">Todos los estados</option>
          <option value="ABIERTA">Abiertas</option>
          <option value="CERRADA">Cerradas</option>
          <option value="FINALIZADA">Finalizadas</option>
        </select>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading">
        <div class="spinner"></div>
        <p>Cargando pollas públicas...</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && filteredPolls.length === 0" class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>No hay pollas públicas disponibles</h3>
        <p>Revisa más tarde o crea tu propia polla pública</p>
        <button class="btn-create" (click)="navigateToCreate()">
          Crear Polla Pública
        </button>
      </div>

      <!-- Pollas Grid -->
      <div class="polls-grid" *ngIf="!loading && filteredPolls.length > 0">
        <div class="poll-card" *ngFor="let poll of filteredPolls">
          <div class="poll-ribbon" *ngIf="poll.estado === 'ABIERTA'">
            <span>✨ Abierta</span>
          </div>
          
          <div class="poll-header">
            <h3>{{ poll.nombre }}</h3>
            <span class="badge" [class]="'badge-' + poll.estado.toLowerCase()">
              {{ getStatusLabel(poll.estado) }}
            </span>
          </div>
          
          <p class="poll-description">{{ poll.descripcion || 'Sin descripción' }}</p>
          
          <div class="poll-details">
            <div class="detail-item">
              <span class="icon">👤</span>
              <span>{{ poll.creadorEmail }}</span>
            </div>
            <div class="detail-item">
              <span class="icon">📅</span>
              <span>{{ formatDate(poll.fechaInicio) }}</span>
            </div>
            <div class="detail-item">
              <span class="icon">💰</span>
              <span class="highlight">\${{ poll.montoEntrada | number }}</span>
            </div>
            <div class="detail-item">
              <span class="icon">👥</span>
              <span>{{ poll.totalParticipantes || 0 }} participantes</span>
            </div>
            <div class="detail-item">
              <span class="icon">⚽</span>
              <span>{{ poll.totalPartidos || 0 }} partidos</span>
            </div>
          </div>

          <div class="poll-footer">
            <button 
              class="btn-participate" 
              (click)="participateInPoll(poll)"
              [disabled]="poll.estado !== 'ABIERTA' || participating === poll.id">
              {{ getParticipateButtonText(poll) }}
            </button>
            <button class="btn-view" (click)="viewPollDetail(poll.id)">
              Ver Detalles
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .public-polls-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
    }

    h2 {
      font-size: 2rem;
      font-weight: 700;
      color: #1a1a1a;
      margin: 0 0 0.5rem 0;
    }

    .subtitle {
      color: #666;
      font-size: 1rem;
      margin: 0;
    }

    .btn-my-polls {
      padding: 0.75rem 1.5rem;
      background: white;
      color: #667eea;
      border: 2px solid #667eea;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-my-polls:hover {
      background: #667eea;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    /* Filtros */
    .filters {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .search-input, .filter-select {
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s;
    }

    .search-input {
      flex: 1;
    }

    .search-input:focus, .filter-select:focus {
      outline: none;
      border-color: #667eea;
    }

    .filter-select {
      min-width: 200px;
    }

    /* Loading */
    .loading {
      text-align: center;
      padding: 4rem 2rem;
    }

    .spinner {
      width: 50px;
      height: 50px;
      margin: 0 auto 1rem;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      color: #333;
      margin-bottom: 0.5rem;
    }

    .empty-state p {
      color: #666;
      margin-bottom: 2rem;
    }

    .btn-create {
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .btn-create:hover {
      transform: translateY(-2px);
    }

    /* Polls Grid */
    .polls-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
    }

    .poll-card {
      position: relative;
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s, box-shadow 0.2s;
      overflow: hidden;
    }

    .poll-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
    }

    .poll-ribbon {
      position: absolute;
      top: 15px;
      right: -35px;
      background: linear-gradient(135deg, #00b894, #00cec9);
      color: white;
      padding: 0.25rem 3rem;
      transform: rotate(45deg);
      font-size: 0.75rem;
      font-weight: 600;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    }

    .poll-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
      gap: 1rem;
    }

    .poll-header h3 {
      margin: 0;
      font-size: 1.3rem;
      color: #1a1a1a;
      flex: 1;
    }

    .badge {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .badge-abierta {
      background: #d4edda;
      color: #155724;
    }

    .badge-cerrada {
      background: #fff3cd;
      color: #856404;
    }

    .badge-finalizada {
      background: #d1ecf1;
      color: #0c5460;
    }

    .poll-description {
      color: #666;
      margin-bottom: 1.5rem;
      line-height: 1.5;
      min-height: 3rem;
    }

    .poll-details {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.95rem;
      color: #444;
    }

    .detail-item .icon {
      font-size: 1.1rem;
    }

    .detail-item .highlight {
      font-weight: 700;
      color: #667eea;
      font-size: 1.1rem;
    }

    .poll-footer {
      display: flex;
      gap: 0.75rem;
    }

    .btn-participate {
      flex: 1;
      padding: 0.75rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .btn-participate:hover:not(:disabled) {
      transform: translateY(-2px);
    }

    .btn-participate:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .btn-view {
      padding: 0.75rem 1rem;
      background: white;
      color: #667eea;
      border: 2px solid #667eea;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-view:hover {
      background: #667eea;
      color: white;
    }

    @media (max-width: 768px) {
      .public-polls-container {
        padding: 1rem;
      }

      .polls-grid {
        grid-template-columns: 1fr;
      }

      .filters {
        flex-direction: column;
      }

      .filter-select {
        min-width: 100%;
      }
    }
  `]
})
export class PollsPublicListComponent implements OnInit {
  private pollService = inject(PollService);
  private authService = inject(AuthService);
  private router = inject(Router);

  polls: Poll[] = [];
  filteredPolls: Poll[] = [];
  loading = false;
  participating: number | null = null;
  
  searchTerm = '';
  filterStatus = '';

  ngOnInit(): void {
    this.loadPublicPolls();
  }

  loadPublicPolls(): void {
    this.loading = true;
    this.pollService.getPublicPolls().subscribe({
      next: (polls) => {
        this.polls = polls;
        this.filterPolls();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading public polls:', err);
        this.loading = false;
      }
    });
  }

  filterPolls(): void {
    this.filteredPolls = this.polls.filter(poll => {
      const matchesSearch = !this.searchTerm || 
        poll.nombre.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesStatus = !this.filterStatus || poll.estado === this.filterStatus;
      return matchesSearch && matchesStatus;
    });
  }

  participateInPoll(poll: Poll): void {
    if (poll.estado !== 'ABIERTA') return;
    
    // Navegar al componente de pago/participación
    this.router.navigate(['/polls/public', poll.id, 'participate']);
  }

  viewPollDetail(pollId: number): void {
    this.router.navigate(['/polls', pollId]);
  }

  navigateToMyPolls(): void {
    this.router.navigate(['/polls']);
  }

  navigateToCreate(): void {
    this.router.navigate(['/polls/create']);
  }

  getParticipateButtonText(poll: Poll): string {
    if (this.participating === poll.id) {
      return 'Procesando...';
    }
    if (poll.estado !== 'ABIERTA') {
      return 'No disponible';
    }
    return `Participar • $${poll.montoEntrada.toLocaleString()}`;
  }

  getStatusLabel(status: string): string {
    const labels: any = {
      'CREADA': 'Creada',
      'ABIERTA': 'Abierta',
      'CERRADA': 'Cerrada',
      'FINALIZADA': 'Finalizada'
    };
    return labels[status] || status;
  }

  formatDate(dateString: string | Date): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
