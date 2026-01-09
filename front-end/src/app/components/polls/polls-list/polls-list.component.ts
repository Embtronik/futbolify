import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PollService } from '../../../services/poll.service';
import { Poll, PollParticipant } from '../../../models/football.model';

@Component({
  selector: 'app-polls-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="polls-list-container">
      <div class="header">
        <h2>Mis Pollas</h2>
        <button class="btn-create" (click)="navigateToCreate()">
          <span class="icon">+</span>
          Crear Nueva Polla
        </button>
      </div>

      <!-- Invitaciones Pendientes -->
      <section class="invitations-section" *ngIf="pendingInvitations.length > 0">
        <h3>Invitaciones Pendientes ({{ pendingInvitations.length }})</h3>
        <div class="invitations-list">
          <div class="invitation-card" *ngFor="let invitation of pendingInvitations">
            <div class="invitation-info">
              <h4>{{ getPollName(invitation.pollaId) }}</h4>
              <p class="invitation-from">
                Invitado por: {{ getPollCreator(invitation.pollaId) }}
              </p>
            </div>
            <div class="invitation-actions">
              <button 
                class="btn-accept" 
                (click)="acceptInvitation(invitation.pollaId)"
                [disabled]="processingInvitation === invitation.pollaId">
                {{ processingInvitation === invitation.pollaId ? 'Aceptando...' : 'Aceptar' }}
              </button>
              <button 
                class="btn-reject" 
                (click)="rejectInvitation(invitation.pollaId)"
                [disabled]="processingInvitation === invitation.pollaId">
                {{ processingInvitation === invitation.pollaId ? 'Rechazando...' : 'Rechazar' }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Pestañas -->
      <div class="tabs">
        <button 
          class="tab" 
          [class.active]="activeTab === 'created'"
          (click)="activeTab = 'created'">
          Mis Pollas Creadas ({{ createdPolls.length }})
        </button>
        <button 
          class="tab" 
          [class.active]="activeTab === 'joined'"
          (click)="activeTab = 'joined'">
          Pollas en las que Participo ({{ joinedPolls.length }})
        </button>
      </div>

      <!-- Pollas Creadas -->
      <section *ngIf="activeTab === 'created'" class="polls-section">
        <div *ngIf="loading" class="loading">Cargando pollas...</div>
        
        <div *ngIf="!loading && createdPolls.length === 0" class="empty-state">
          <p>No has creado ninguna polla aún</p>
          <button class="btn-create-empty" (click)="navigateToCreate()">
            Crear mi primera polla
          </button>
        </div>

        <div class="polls-grid">
          <div class="poll-card" *ngFor="let poll of createdPolls" (click)="viewPollDetail(poll.id)">
            <div class="poll-header">
              <h3>{{ poll.nombre }}</h3>
              <span class="badge" [class]="'badge-' + poll.estado.toLowerCase()">
                {{ getStatusLabel(poll.estado) }}
              </span>
            </div>
            
            <p class="poll-description">{{ poll.descripcion }}</p>
            
            <div class="poll-details">
              <div class="detail-item">
                <span class="icon">📅</span>
                <span>{{ formatDate(poll.fechaInicio) }}</span>
              </div>
              <div class="detail-item">
                <span class="icon">💰</span>
                <span>$</span><span>{{ poll.montoEntrada | number }}</span>
              </div>
              <div class="detail-item">
                <span class="icon">👥</span>
                <span>{{ poll.participantesCount || 0 }} participantes</span>
              </div>
            </div>

            <div class="poll-footer">
              <button class="btn-manage" (click)="managePoll(poll.id); $event.stopPropagation()">
                Gestionar
              </button>
              <button class="btn-view" (click)="viewPollDetail(poll.id); $event.stopPropagation()">
                Ver Detalles
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Pollas en las que Participo -->
      <section *ngIf="activeTab === 'joined'" class="polls-section">
        <div *ngIf="loading" class="loading">Cargando pollas...</div>
        
        <div *ngIf="!loading && joinedPolls.length === 0" class="empty-state">
          <p>No estás participando en ninguna polla</p>
        </div>

        <div class="polls-grid">
          <div class="poll-card" *ngFor="let poll of joinedPolls" (click)="viewPollDetail(poll.id)">
            <div class="poll-header">
              <h3>{{ poll.nombre }}</h3>
              <span class="badge" [class]="'badge-' + poll.estado.toLowerCase()">
                {{ getStatusLabel(poll.estado) }}
              </span>
            </div>
            
            <p class="poll-description">{{ poll.descripcion }}</p>
            
            <div class="poll-details">
              <div class="detail-item">
                <span class="icon">👤</span>
                <span>Creada por: {{ poll.creadorEmail }}</span>
              </div>
              <div class="detail-item">
                <span class="icon">📅</span>
                <span>{{ formatDate(poll.fechaInicio) }}</span>
              </div>
              <div class="detail-item">
                <span class="icon">💰</span>
                <span>$</span><span>{{ poll.montoEntrada | number }}</span>
              </div>
            </div>

            <div class="poll-footer">
              <button 
                class="btn-predict" 
                (click)="goToPredictions(poll.id); $event.stopPropagation()"
                [disabled]="poll.estado === 'FINALIZADA'">
                {{ poll.estado === 'FINALIZADA' ? 'Finalizada' : 'Hacer Pronósticos' }}
              </button>
              <button class="btn-view" (click)="viewPollDetail(poll.id); $event.stopPropagation()">
                Ver Ranking
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .polls-list-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    h2 {
      font-size: 2rem;
      font-weight: 700;
      color: #1a1a1a;
      margin: 0;
    }

    .btn-create {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .btn-create:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-create .icon {
      font-size: 1.5rem;
      line-height: 1;
    }

    /* Invitaciones Pendientes */
    .invitations-section {
      background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }

    .invitations-section h3 {
      margin: 0 0 1rem 0;
      color: #2d3436;
      font-size: 1.2rem;
    }

    .invitations-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .invitation-card {
      background: white;
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .invitation-info h4 {
      margin: 0 0 0.25rem 0;
      color: #1a1a1a;
      font-size: 1.1rem;
    }

    .invitation-from {
      margin: 0;
      color: #666;
      font-size: 0.9rem;
    }

    .invitation-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-accept, .btn-reject {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-accept {
      background: #00b894;
      color: white;
    }

    .btn-accept:hover:not(:disabled) {
      background: #00a185;
    }

    .btn-reject {
      background: #d63031;
      color: white;
    }

    .btn-reject:hover:not(:disabled) {
      background: #c0231f;
    }

    .btn-accept:disabled, .btn-reject:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Tabs */
    .tabs {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
      border-bottom: 2px solid #e0e0e0;
    }

    .tab {
      padding: 0.75rem 1.5rem;
      background: none;
      border: none;
      border-bottom: 3px solid transparent;
      font-size: 1rem;
      font-weight: 600;
      color: #666;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: -2px;
    }

    .tab.active {
      color: #667eea;
      border-bottom-color: #667eea;
    }

    .tab:hover {
      color: #667eea;
    }

    /* Sección de Pollas */
    .polls-section {
      min-height: 400px;
    }

    .loading {
      text-align: center;
      padding: 3rem;
      color: #666;
      font-size: 1.1rem;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: #666;
    }

    .empty-state p {
      font-size: 1.1rem;
      margin-bottom: 1.5rem;
    }

    .btn-create-empty {
      padding: 0.75rem 1.5rem;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-create-empty:hover {
      background: #5568d3;
    }

    /* Grid de Pollas */
    .polls-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
    }

    .poll-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: all 0.3s;
      cursor: pointer;
    }

    .poll-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    }

    .poll-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 1rem;
    }

    .poll-header h3 {
      margin: 0;
      color: #1a1a1a;
      font-size: 1.3rem;
      font-weight: 700;
      flex: 1;
    }

    .badge {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      white-space: nowrap;
      margin-left: 0.5rem;
    }

    .badge-creada {
      background: #e3f2fd;
      color: #1976d2;
    }

    .badge-abierta {
      background: #e8f5e9;
      color: #388e3c;
    }

    .badge-cerrada {
      background: #fff3e0;
      color: #f57c00;
    }

    .badge-finalizada {
      background: #f5f5f5;
      color: #616161;
    }

    .poll-description {
      color: #666;
      margin: 0 0 1rem 0;
      line-height: 1.5;
    }

    .poll-details {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #444;
      font-size: 0.9rem;
    }

    .detail-item .icon {
      font-size: 1.2rem;
    }

    .poll-footer {
      display: flex;
      gap: 0.5rem;
      padding-top: 1rem;
      border-top: 1px solid #e0e0e0;
    }

    .poll-footer button {
      flex: 1;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-manage {
      background: #667eea;
      color: white;
    }

    .btn-manage:hover {
      background: #5568d3;
    }

    .btn-view {
      background: #f0f0f0;
      color: #444;
    }

    .btn-view:hover {
      background: #e0e0e0;
    }

    .btn-predict {
      background: #00b894;
      color: white;
    }

    .btn-predict:hover:not(:disabled) {
      background: #00a185;
    }

    .btn-predict:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .polls-list-container {
        padding: 1rem;
      }

      .header {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
      }

      .btn-create {
        justify-content: center;
      }

      .polls-grid {
        grid-template-columns: 1fr;
      }

      .invitation-card {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
      }

      .invitation-actions {
        justify-content: stretch;
      }

      .invitation-actions button {
        flex: 1;
      }
    }
  `]
})
export class PollsListComponent implements OnInit {
  private pollService = inject(PollService);
  private router = inject(Router);

  createdPolls: Poll[] = [];
  joinedPolls: Poll[] = [];
  pendingInvitations: PollParticipant[] = [];
  allPolls: Poll[] = [];
  
  activeTab: 'created' | 'joined' = 'created';
  loading = true;
  processingInvitation: number | null = null;

  ngOnInit(): void {
    this.loadPolls();
    this.loadInvitations();
  }

  loadPolls(): void {
    this.loading = true;
    this.pollService.getMyPolls().subscribe({
      next: (polls) => {
        this.allPolls = polls;
        this.separatePolls(polls);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading polls:', err);
        this.loading = false;
      }
    });
  }

  loadInvitations(): void {
    this.pollService.getMyInvitations().subscribe({
      next: (invitations) => {
        this.pendingInvitations = invitations.filter(inv => inv.estado === 'INVITADO');
      },
      error: (err) => {
        console.error('Error loading invitations:', err);
      }
    });
  }

  separatePolls(polls: Poll[]): void {
    const userEmail = this.getUserEmail();
    
    this.createdPolls = polls.filter(poll => poll.creadorEmail === userEmail);
    // Joined polls are those where user is not creator but has accepted invitation
    // Backend should return only relevant polls
    this.joinedPolls = polls.filter(poll => poll.creadorEmail !== userEmail);
  }

  acceptInvitation(pollId: number): void {
    this.processingInvitation = pollId;
    this.pollService.acceptInvitation(pollId).subscribe({
      next: () => {
        this.pendingInvitations = this.pendingInvitations.filter(inv => inv.pollaId !== pollId);
        this.processingInvitation = null;
        this.loadPolls(); // Reload to show in joined polls
      },
      error: (err) => {
        console.error('Error accepting invitation:', err);
        this.processingInvitation = null;
        alert('Error al aceptar la invitación. Por favor intenta de nuevo.');
      }
    });
  }

  rejectInvitation(pollId: number): void {
    this.processingInvitation = pollId;
    this.pollService.rejectInvitation(pollId).subscribe({
      next: () => {
        this.pendingInvitations = this.pendingInvitations.filter(inv => inv.pollaId !== pollId);
        this.processingInvitation = null;
      },
      error: (err) => {
        console.error('Error rejecting invitation:', err);
        this.processingInvitation = null;
        alert('Error al rechazar la invitación. Por favor intenta de nuevo.');
      }
    });
  }

  navigateToCreate(): void {
    this.router.navigate(['/polls/create']);
  }

  viewPollDetail(pollId: number): void {
    this.router.navigate(['/polls', pollId]);
  }

  managePoll(pollId: number): void {
    this.router.navigate(['/polls', pollId, 'manage']);
  }

  goToPredictions(pollId: number): void {
    this.router.navigate(['/polls', pollId, 'predictions']);
  }

  getPollName(pollId: number): string {
    const poll = this.allPolls.find(p => p.id === pollId);
    return poll?.nombre || 'Polla';
  }

  getPollCreator(pollId: number): string {
    const poll = this.allPolls.find(p => p.id === pollId);
    return poll?.creadorEmail || 'Desconocido';
  }

  getStatusLabel(estado: string): string {
    const labels: Record<string, string> = {
      'CREADA': 'Creada',
      'ABIERTA': 'Abierta',
      'CERRADA': 'Cerrada',
      'FINALIZADA': 'Finalizada'
    };
    return labels[estado] || estado;
  }

  formatDate(dateString: string | Date): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  private getUserEmail(): string {
    // TODO: Get from auth service
    return localStorage.getItem('userEmail') || '';
  }
}
