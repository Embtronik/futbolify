package com.teamsservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response de validación de pago del payment-service
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentValidationResponse {
    
    private boolean valid; // Si el pago es válido
    private String paymentId; // ID del pago en el sistema de pagos
    private String paymentReference; // Referencia del pago
    private BigDecimal amount; // Monto pagado
    private String status; // Estado del pago: APPROVED, PENDING, REJECTED
    private LocalDateTime paymentDate; // Fecha del pago
    private String message; // Mensaje adicional
}
