import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PollService } from '../../../services/poll.service';
import { PaymentService } from '../../../services/payment.service';
import { AuthService } from '../../../services/auth.service';
import { Poll, ParticipateInPublicPollRequest, CreatePaymentTransactionRequest } from '../../../models/football.model';

@Component({
  selector: 'app-poll-participate',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="participate-container">
      <div class="back-button" (click)="goBack()">
        ← Volver
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading">
        <div class="spinner"></div>
        <p>Cargando información...</p>
      </div>

      <!-- Poll Details -->
      <div *ngIf="!loading && poll" class="content">
        <div class="poll-info-card">
          <div class="card-header">
            <h2>{{ poll.nombre }}</h2>
            <span class="badge badge-public">📢 Pública</span>
          </div>

          <p class="poll-description">{{ poll.descripcion || 'Sin descripción' }}</p>

          <div class="poll-details">
            <div class="detail-row">
              <span class="label">Creador:</span>
              <span class="value">{{ poll.creadorEmail }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Fecha de inicio:</span>
              <span class="value">{{ formatDate(poll.fechaInicio) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Cuota de entrada:</span>
              <span class="value highlight">\${{ poll.montoEntrada | number }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Participantes actuales:</span>
              <span class="value">{{ poll.totalParticipantes || 0 }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Total de partidos:</span>
              <span class="value">{{ poll.totalPartidos || 0 }}</span>
            </div>
          </div>
        </div>

        <!-- Payment Form -->
        <div class="payment-card">
          <h3>💳 Realizar Pago</h3>
          <p class="payment-instruction">
            Para participar en esta polla, debes realizar el pago de <strong>\${{ poll.montoEntrada | number }}</strong>.
          </p>

          <!-- Tabs para seleccionar modo de pago -->
          <div class="payment-tabs">
            <button 
              type="button"
              class="tab"
              [class.active]="paymentMode === 'new'"
              (click)="paymentMode = 'new'">
              💳 Pagar Ahora
            </button>
            <button 
              type="button"
              class="tab"
              [class.active]="paymentMode === 'existing'"
              (click)="paymentMode = 'existing'">
              ✅ Ya Pagué
            </button>
          </div>

          <!-- Modo: Pagar Ahora (Wompi) -->
          <form *ngIf="paymentMode === 'new'" [formGroup]="newPaymentForm" (ngSubmit)="processNewPayment()" class="payment-form">
            <div class="payment-info-box">
              <p><strong>🔐 Pago seguro con Wompi</strong></p>
              <p class="small-text">Ingresa los datos de tu método de pago. Tu información está protegida.</p>
            </div>

            <div class="form-group">
              <label for="paymentSourceId">ID Fuente de Pago (Wompi) *</label>
              <input 
                id="paymentSourceId"
                type="text" 
                formControlName="paymentSourceId"
                placeholder="Ej: 123456 (ID de tu tarjeta o método de pago)"
                class="form-control"
                [class.error]="newPaymentForm.get('paymentSourceId')?.invalid && newPaymentForm.get('paymentSourceId')?.touched">
              <span class="error-message" *ngIf="newPaymentForm.get('paymentSourceId')?.hasError('required') && newPaymentForm.get('paymentSourceId')?.touched">
                El ID de la fuente de pago es requerido
              </span>
              <small class="help-text">
                Obtenlo desde el widget/SDK de Wompi después de registrar tu método de pago
              </small>
            </div>

            <div class="form-group">
              <label for="acceptanceToken">Token de Aceptación (Wompi) *</label>
              <input 
                id="acceptanceToken"
                type="text" 
                formControlName="acceptanceToken"
                placeholder="Token de términos y condiciones"
                class="form-control"
                [class.error]="newPaymentForm.get('acceptanceToken')?.invalid && newPaymentForm.get('acceptanceToken')?.touched">
              <span class="error-message" *ngIf="newPaymentForm.get('acceptanceToken')?.hasError('required') && newPaymentForm.get('acceptanceToken')?.touched">
                El token de aceptación es requerido
              </span>
              <small class="help-text">
                Token de aceptación de términos de Wompi
              </small>
            </div>

            <div class="form-group">
              <label for="installments">Número de Cuotas</label>
              <select 
                id="installments"
                formControlName="installments"
                class="form-control">
                <option value="1">1 - Pago único</option>
                <option value="2">2 cuotas</option>
                <option value="3">3 cuotas</option>
                <option value="6">6 cuotas</option>
                <option value="12">12 cuotas</option>
              </select>
            </div>

            <div *ngIf="errorMessage" class="alert alert-danger">
              {{ errorMessage }}
            </div>

            <div *ngIf="successMessage" class="alert alert-success">
              {{ successMessage }}
            </div>

            <div class="form-actions">
              <button 
                type="button" 
                class="btn-cancel" 
                (click)="goBack()"
                [disabled]="processing">
                Cancelar
              </button>
              <button 
                type="submit" 
                class="btn-confirm" 
                [disabled]="!newPaymentForm.valid || processing">
                {{ processing ? 'Procesando Pago...' : 'Pagar \$' + (poll.montoEntrada | number) }}
              </button>
            </div>
          </form>

          <!-- Modo: Ya Pagué (Referencia existente) -->
          <form *ngIf="paymentMode === 'existing'" [formGroup]="existingPaymentForm" (ngSubmit)="confirmWithExistingPayment()" class="payment-form">
            <div class="payment-info-box">
              <p><strong>✅ Si ya realizaste el pago</strong></p>
              <p class="small-text">Ingresa la referencia de pago que recibiste al completar la transacción.</p>
            </div>

            <div class="form-group">
              <label for="existingReference">Referencia de Pago *</label>
              <input 
                id="existingReference"
                type="text" 
                formControlName="paymentReference"
                placeholder="Ej: POLLA-1-usuario-20260217-001"
                class="form-control"
                [class.error]="existingPaymentForm.get('paymentReference')?.invalid && existingPaymentForm.get('paymentReference')?.touched">
              <span class="error-message" *ngIf="existingPaymentForm.get('paymentReference')?.hasError('required') && existingPaymentForm.get('paymentReference')?.touched">
                La referencia de pago es requerida
              </span>
              <span class="error-message" *ngIf="existingPaymentForm.get('paymentReference')?.hasError('minlength')">
                La referencia debe tener al menos 10 caracteres
              </span>
              <small class="help-text">
                Ingresa la referencia exacta que recibiste al realizar el pago
              </small>
            </div>

            <div *ngIf="errorMessage" class="alert alert-danger">
              {{ errorMessage }}
            </div>

            <div *ngIf="successMessage" class="alert alert-success">
              {{ successMessage }}
            </div>

            <div class="form-actions">
              <button 
                type="button" 
                class="btn-cancel" 
                (click)="goBack()"
                [disabled]="processing">
                Cancelar
              </button>
              <button 
                type="submit" 
                class="btn-confirm" 
                [disabled]="!existingPaymentForm.valid || processing">
                {{ processing ? 'Verificando...' : 'Confirmar Participación' }}
              </button>
            </div>
          </form>

          <div class="payment-note">
            <strong>💡 Sobre Wompi:</strong> Wompi es una plataforma de pagos segura. 
            Necesitas registrar tu método de pago a través de su SDK para obtener el paymentSourceId y acceptanceToken.
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div *ngIf="!loading && !poll" class="error-state">
        <div class="error-icon">⚠️</div>
        <h3>Polla no encontrada</h3>
        <p>No se pudo cargar la información de esta polla.</p>
        <button class="btn-back" (click)="goBack()">Volver</button>
      </div>
    </div>
  `,
  styles: [`
    .participate-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
    }

    .back-button {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      color: #667eea;
      font-weight: 600;
      cursor: pointer;
      margin-bottom: 1.5rem;
      transition: transform 0.2s;
    }

    .back-button:hover {
      transform: translateX(-4px);
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

    /* Content */
    .content {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .poll-info-card, .payment-card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
      gap: 1rem;
    }

    .card-header h2 {
      margin: 0;
      font-size: 1.8rem;
      color: #1a1a1a;
    }

    .badge {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .badge-public {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
    }

    .poll-description {
      color: #666;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }

    .poll-details {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1.5rem;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .detail-row .label {
      color: #666;
      font-weight: 500;
    }

    .detail-row .value {
      color: #1a1a1a;
      font-weight: 600;
    }

    .detail-row .highlight {
      color: #667eea;
      font-size: 1.2rem;
    }

    /* Payment Card */
    .payment-card h3 {
      margin: 0 0 1rem 0;
      color: #1a1a1a;
      font-size: 1.5rem;
    }

    .payment-instruction {
      color: #666;
      margin-bottom: 2rem;
      line-height: 1.6;
    }

    /* Payment Tabs */
    .payment-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 2rem;
      border-bottom: 2px solid #e0e0e0;
    }

    .payment-tabs .tab {
      flex: 1;
      padding: 0.75rem 1rem;
      background: none;
      border: none;
      border-bottom: 3px solid transparent;
      font-size: 1rem;
      font-weight: 600;
      color: #666;
      cursor: pointer;
      transition: all 0.2s;
    }

    .payment-tabs .tab:hover {
      color: #667eea;
      background: #f8f9fa;
    }

    .payment-tabs .tab.active {
      color: #667eea;
      border-bottom-color: #667eea;
      background: #f8f9ff;
    }

    /* Payment Info Box */
    .payment-info-box {
      padding: 1rem;
      background: linear-gradient(135deg, #e8ecff 0%, #f8f9ff 100%);
      border-left: 4px solid #667eea;
      border-radius: 8px;
      margin-bottom: 1.5rem;
    }

    .payment-info-box p {
      margin: 0 0 0.5rem 0;
      color: #1a1a1a;
    }

    .payment-info-box .small-text {
      font-size: 0.9rem;
      color: #666;
      margin: 0;
    }

    .payment-steps {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .step {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }

    .step-number {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      flex-shrink: 0;
    }

    .step-content h4 {
      margin: 0 0 0.5rem 0;
      color: #1a1a1a;
      font-size: 1.1rem;
    }

    .step-content p {
      margin: 0;
      color: #666;
      line-height: 1.5;
    }

    /* Form */
    .payment-form {
      margin-bottom: 1.5rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #444;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s;
    }

    .form-control:focus {
      outline: none;
      border-color: #667eea;
    }

    .form-control.error {
      border-color: #d63031;
    }

    .error-message {
      display: block;
      color: #d63031;
      font-size: 0.85rem;
      margin-top: 0.25rem;
    }

    .help-text {
      display: block;
      color: #999;
      font-size: 0.85rem;
      margin-top: 0.25rem;
    }

    .alert {
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
    }

    .alert-danger {
      background: #fee;
      color: #d63031;
      border: 1px solid #d63031;
    }

    .alert-success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #155724;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .btn-cancel, .btn-confirm {
      flex: 1;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-cancel {
      background: #f0f0f0;
      color: #666;
    }

    .btn-cancel:hover:not(:disabled) {
      background: #e0e0e0;
    }

    .btn-confirm {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-confirm:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .btn-cancel:disabled, .btn-confirm:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .payment-note {
      padding: 1rem;
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      border-radius: 4px;
      font-size: 0.9rem;
      line-height: 1.6;
      color: #856404;
    }

    /* Error State */
    .error-state {
      text-align: center;
      padding: 4rem 2rem;
    }

    .error-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .error-state h3 {
      color: #333;
      margin-bottom: 0.5rem;
    }

    .error-state p {
      color: #666;
      margin-bottom: 2rem;
    }

    .btn-back {
      padding: 0.75rem 1.5rem;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .btn-back:hover {
      transform: translateY(-2px);
    }

    @media (max-width: 768px) {
      .participate-container {
        padding: 1rem;
      }

      .poll-info-card, .payment-card {
        padding: 1.5rem;
      }

      .card-header {
        flex-direction: column;
      }

      .form-actions {
        flex-direction: column;
      }
    }
  `]
})
export class PollParticipateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private pollService = inject(PollService);
  private paymentService = inject(PaymentService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  poll: Poll | null = null;
  loading = false;
  processing = false;
  errorMessage = '';
  successMessage = '';
  
  paymentMode: 'new' | 'existing' = 'new'; // Modo de pago predeterminado
  
  newPaymentForm: FormGroup; // Formulario para crear nuevo pago
  existingPaymentForm: FormGroup; // Formulario para usar referencia existente

  constructor() {
    // Formulario para crear nuevo pago con Wompi
    this.newPaymentForm = this.fb.group({
      paymentSourceId: ['', Validators.required],
      acceptanceToken: ['', Validators.required],
      installments: [1, Validators.required]
    });

    // Formulario para usar referencia de pago existente
    this.existingPaymentForm = this.fb.group({
      paymentReference: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit(): void {
    const pollId = Number(this.route.snapshot.paramMap.get('id'));
    if (pollId) {
      this.loadPollDetails(pollId);
    }
  }

  loadPollDetails(pollId: number): void {
    this.loading = true;
    this.pollService.getPollById(pollId).subscribe({
      next: (poll) => {
        this.poll = poll;
        this.loading = false;
        
        // Verificar que sea una polla pública
        if (poll.tipo !== 'PUBLICA') {
          this.errorMessage = 'Esta no es una polla pública.';
        }
        
        // Verificar que esté abierta
        if (poll.estado !== 'ABIERTA') {
          this.errorMessage = 'Esta polla no está abierta para participación.';
        }
      },
      error: (err) => {
        console.error('Error loading poll:', err);
        this.loading = false;
        this.poll = null;
      }
    });
  }

  /**
   * Procesar nuevo pago con Wompi
   */
  processNewPayment(): void {
    if (!this.newPaymentForm.valid || !this.poll) return;

    this.processing = true;
    this.errorMessage = '';
    this.successMessage = '';

    const currentUser = this.authService.getCurrentUserValue();
    if (!currentUser) {
      this.errorMessage = 'Usuario no autenticado';
      this.processing = false;
      return;
    }

    // Generar referencia única para el pago
    const paymentReference = this.paymentService.generatePaymentReference(
      this.poll.id,
      currentUser.email
    );

    // Preparar request para payment-service
    const paymentRequest: CreatePaymentTransactionRequest = {
      reference: paymentReference,
      amountInCents: Math.round(this.poll.montoEntrada * 100), // Convertir a centavos
      currency: 'COP',
      customerEmail: currentUser.email,
      paymentSourceId: this.newPaymentForm.value.paymentSourceId,
      installments: this.newPaymentForm.value.installments,
      acceptanceToken: this.newPaymentForm.value.acceptanceToken
    };

    console.log('🔵 Creando transacción de pago:', paymentRequest);

    // Crear transacción en payment-service
    this.paymentService.createTransaction(paymentRequest).subscribe({
      next: (transaction) => {
        console.log('✅ Transacción creada:', transaction);
        
        // Verificar estado de la transacción
        if (transaction.status === 'APPROVED') {
          // Si fue aprobado, confirmar participación inmediatamente
          this.confirmParticipationWithReference(transaction.reference);
        } else if (transaction.status === 'PENDING') {
          this.successMessage = 'Pago en proceso. Por favor espera la confirmación...';
          this.processing = false;
          
          // Podrías implementar polling aquí para verificar el estado
          setTimeout(() => {
            this.checkTransactionStatus(transaction.reference);
          }, 3000);
        } else {
          this.errorMessage = `Pago ${transaction.status.toLowerCase()}. Por favor intenta de nuevo.`;
          this.processing = false;
        }
      },
      error: (err) => {
        console.error('Error creating payment transaction:', err);
        this.processing = false;
        
        if (err.error?.message) {
          this.errorMessage = err.error.message;
        } else {
          this.errorMessage = 'Error al procesar el pago. Por favor intenta nuevamente.';
        }
      }
    });
  }

  /**
   * Verificar estado de transacción (para pagos pendientes)
   */
  checkTransactionStatus(reference: string): void {
    this.paymentService.getTransactionByReference(reference).subscribe({
      next: (transaction) => {
        if (transaction.status === 'APPROVED') {
          this.confirmParticipationWithReference(reference);
        } else if (transaction.status === 'PENDING') {
          this.successMessage = 'Pago aún pendiente. Guarda tu referencia: ' + reference;
          this.processing = false;
        } else {
          this.errorMessage = `Pago ${transaction.status.toLowerCase()}. Referencia: ${reference}`;
          this.processing = false;
        }
      },
      error: (err) => {
        console.error('Error checking transaction status:', err);
        this.errorMessage = 'No se pudo verificar el estado del pago. Referencia: ' + reference;
        this.processing = false;
      }
    });
  }

  /**
   * Confirmar participación con referencia de pago existente
   */
  confirmWithExistingPayment(): void {
    if (!this.existingPaymentForm.valid || !this.poll) return;

    const reference = this.existingPaymentForm.value.paymentReference;
    this.confirmParticipationWithReference(reference);
  }

  /**
   * Confirmar participación con teams-service usando referencia de pago
   */
  private confirmParticipationWithReference(reference: string): void {
    if (!this.poll) return;

    this.processing = true;
    this.errorMessage = '';
    this.successMessage = '';

    const request: ParticipateInPublicPollRequest = {
      paymentReference: reference
    };

    console.log('🔵 Confirmando participación con referencia:', reference);

    this.pollService.participateInPublicPoll(this.poll.id, request).subscribe({
      next: (poll) => {
        this.processing = false;
        this.successMessage = '¡Participación confirmada! Redirigiendo...';
        
        console.log('✅ Participación exitosa en polla:', poll);
        
        // Redirigir a la polla después de 2 segundos
        setTimeout(() => {
          this.router.navigate(['/polls', poll.id]);
        }, 2000);
      },
      error: (err) => {
        this.processing = false;
        console.error('Error participating in poll:', err);
        
        // Mostrar mensaje de error específico
        if (err.error?.message) {
          this.errorMessage = err.error.message;
        } else if (err.status === 400) {
          this.errorMessage = 'Pago no válido o polla no disponible. Verifica tu referencia de pago.';
        } else if (err.status === 404) {
          this.errorMessage = 'Polla no encontrada.';
        } else if (err.status === 500) {
          this.errorMessage = 'Error al verificar el pago. Por favor intenta nuevamente.';
        } else {
          this.errorMessage = 'Error al procesar tu participación. Por favor intenta nuevamente.';
        }
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/polls/public']);
  }

  formatDate(dateString: string | Date): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
