import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  CreatePaymentTransactionRequest, 
  PaymentTransactionResponse 
} from '../models/football.model';
import { environment } from '../../environments/environment';

/**
 * Servicio para gestión de pagos con Wompi a través del payment-service
 */
@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private readonly API_URL = environment.paymentApiUrl;
  private http = inject(HttpClient);

  /**
   * Crear una transacción de pago con Wompi
   * POST /api/v1/payments/transactions
   */
  createTransaction(request: CreatePaymentTransactionRequest): Observable<PaymentTransactionResponse> {
    return this.http.post<PaymentTransactionResponse>(`${this.API_URL}/transactions`, request);
  }

  /**
   * Consultar transacción por ID
   * GET /api/v1/payments/{id}
   */
  getTransactionById(id: string): Observable<PaymentTransactionResponse> {
    return this.http.get<PaymentTransactionResponse>(`${this.API_URL}/${id}`);
  }

  /**
   * Consultar transacción por referencia
   * GET /api/v1/payments/reference/{reference}
   */
  getTransactionByReference(reference: string): Observable<PaymentTransactionResponse> {
    return this.http.get<PaymentTransactionResponse>(`${this.API_URL}/reference/${reference}`);
  }

  /**
   * Verificar si un usuario ya pagó por una polla
   * GET /api/v1/payments/check?userEmail={email}&pollaId={id}
   */
  checkPaymentForPoll(userEmail: string, pollaId: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.API_URL}/check`, {
      params: { userEmail, pollaId: pollaId.toString() }
    });
  }

  /**
   * Generar referencia única para un pago
   * Formato: POLLA-{pollaId}-{email}-{timestamp}-{random}
   */
  generatePaymentReference(pollaId: number, userEmail: string): string {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const emailPrefix = userEmail.split('@')[0].substring(0, 8);
    return `POLLA-${pollaId}-${emailPrefix}-${timestamp}-${random}`;
  }
}
