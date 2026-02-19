package com.payment.service.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record PaymentValidationRequest(
        @NotBlank(message = "El userEmail es obligatorio")
        @Email(message = "Email inválido")
        String userEmail,
        @NotBlank(message = "La referencia de pago es obligatoria")
        String paymentReference,
        @NotNull(message = "El monto esperado es obligatorio")
        @DecimalMin(value = "0.01", message = "El monto esperado debe ser mayor a 0")
        BigDecimal expectedAmount,
        @NotBlank(message = "El concepto es obligatorio")
        String concept,
        @NotNull(message = "El id de la polla es obligatorio")
        Long pollaId
) {
}
