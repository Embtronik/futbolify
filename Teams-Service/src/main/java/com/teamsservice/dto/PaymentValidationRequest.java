package com.teamsservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Request para validar un pago con el payment-service
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentValidationRequest {
    
    private String userEmail;
    private String paymentReference; // Referencia del pago proporcionada por el usuario
    private BigDecimal expectedAmount; // Monto esperado de la polla
    private String concept; // Concepto: "Polla: {nombre}"
    private Long pollaId; // ID de la polla para asociar el pago
}
