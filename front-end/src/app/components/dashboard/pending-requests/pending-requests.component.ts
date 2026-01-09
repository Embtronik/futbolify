import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeamService } from '../../../services/team.service';
import { TeamMember } from '../../../models/football.model';

@Component({
  selector: 'app-pending-requests',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pending-requests-section">
      <div class="section-header">
        <h2>Solicitudes Pendientes</h2>
        <span class="badge" *ngIf="pendingRequests.length > 0">{{ pendingRequests.length }}</span>
      </div>

      <div *ngIf="pendingRequests.length === 0 && !loading" class="empty-message">
        <p>✅ No hay solicitudes pendientes</p>
      </div>

      <div *ngIf="loading" class="loading-message">
        <div class="spinner-small"></div>
        <span>Cargando solicitudes...</span>
      </div>

      <div class="requests-list" *ngIf="pendingRequests.length > 0">
        <div *ngFor="let request of pendingRequests" class="request-card">
          <div class="request-info">
            <div class="request-icon">👤</div>
            <div class="request-details">
              <h4>{{ request.userEmail }}</h4>
              <p class="request-date">
                📅 {{ request.requestedAt | date:'dd/MM/yyyy HH:mm' }}
              </p>
            </div>
          </div>
          <div class="request-actions">
            <button 
              class="btn btn-success" 
              (click)="approveRequest(request)"
              [disabled]="processing"
            >
              ✅ Aprobar
            </button>
            <button 
              class="btn btn-danger" 
              (click)="rejectRequest(request)"
              [disabled]="processing"
            >
              ❌ Rechazar
            </button>
          </div>
        </div>
      </div>

      <div *ngIf="successMessage" class="success-toast">
        {{ successMessage }}
      </div>

      <div *ngIf="errorMessage" class="error-toast">
        {{ errorMessage }}
      </div>
    </div>
  `,
  styles: [`
    .pending-requests-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .section-header h2 {
      font-size: 20px;
      color: var(--dark-color);
      margin: 0;
    }

    .badge {
      background: #f59e0b;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
    }

    .empty-message {
      text-align: center;
      padding: 40px 20px;
      color: #666;
    }

    .empty-message p {
      font-size: 16px;
      margin: 0;
    }

    .loading-message {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 40px 20px;
      color: #666;
    }

    .spinner-small {
      width: 24px;
      height: 24px;
      border: 3px solid var(--border-color);
      border-top-color: var(--primary-color);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .requests-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .request-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      transition: all 0.2s;
    }

    .request-card:hover {
      border-color: var(--primary-color);
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
    }

    .request-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .request-icon {
      font-size: 32px;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f3f4f6;
      border-radius: 50%;
    }

    .request-details h4 {
      font-size: 16px;
      color: var(--dark-color);
      margin: 0 0 4px 0;
    }

    .request-date {
      font-size: 14px;
      color: #666;
      margin: 0;
    }

    .request-actions {
      display: flex;
      gap: 8px;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-success {
      background: #10b981;
      color: white;
    }

    .btn-success:hover:not(:disabled) {
      background: #059669;
    }

    .btn-danger {
      background: #ef4444;
      color: white;
    }

    .btn-danger:hover:not(:disabled) {
      background: #dc2626;
    }

    .success-toast,
    .error-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 16px 24px;
      border-radius: 8px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease-out;
      z-index: 1000;
    }

    .success-toast {
      background: #d1fae5;
      color: #065f46;
    }

    .error-toast {
      background: #fee2e2;
      color: #991b1b;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @media (max-width: 768px) {
      .request-card {
        flex-direction: column;
        gap: 16px;
      }

      .request-actions {
        width: 100%;
      }

      .request-actions .btn {
        flex: 1;
      }
    }
  `]
})
export class PendingRequestsComponent implements OnInit {
  @Input() teamId!: number;

  private teamService = inject(TeamService);
  
  pendingRequests: TeamMember[] = [];
  loading = false;
  processing = false;
  successMessage = '';
  errorMessage = '';

  ngOnInit(): void {
    if (this.teamId) {
      this.loadPendingRequests();
    }
  }

  loadPendingRequests(): void {
    this.loading = true;
    this.teamService.getPendingRequests(this.teamId).subscribe({
      next: (requests) => {
        this.pendingRequests = requests;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading pending requests:', error);
        this.loading = false;
      }
    });
  }

  approveRequest(request: TeamMember): void {
    this.processing = true;
    this.teamService.approveMember(this.teamId, request.id, true).subscribe({
      next: () => {
        this.pendingRequests = this.pendingRequests.filter(r => r.id !== request.id);
        this.showSuccess(`✅ ${request.userEmail} aprobado exitosamente`);
        this.processing = false;
      },
      error: (error) => {
        console.error('Error approving request:', error);
        this.showError('❌ Error al aprobar la solicitud');
        this.processing = false;
      }
    });
  }

  rejectRequest(request: TeamMember): void {
    this.processing = true;
    this.teamService.approveMember(this.teamId, request.id, false).subscribe({
      next: () => {
        this.pendingRequests = this.pendingRequests.filter(r => r.id !== request.id);
        this.showSuccess(`Solicitud de ${request.userEmail} rechazada`);
        this.processing = false;
      },
      error: (error) => {
        console.error('Error rejecting request:', error);
        this.showError('❌ Error al rechazar la solicitud');
        this.processing = false;
      }
    });
  }

  private showSuccess(message: string): void {
    this.successMessage = message;
    setTimeout(() => this.successMessage = '', 3000);
  }

  private showError(message: string): void {
    this.errorMessage = message;
    setTimeout(() => this.errorMessage = '', 3000);
  }
}
