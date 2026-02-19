package com.payment.service.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CreatePaymentRequest(
        @NotBlank(message = "La referencia es obligatoria")
        String reference,
        @Min(value = 1, message = "El monto debe ser mayor a 0")
        Long amountInCents,
        @NotBlank(message = "La moneda es obligatoria")
        @Pattern(regexp = "^[A-Z]{3}$", message = "La moneda debe tener formato ISO-4217")
        String currency,
        @NotBlank(message = "El correo del cliente es obligatorio")
        @Email(message = "Correo inválido")
        String customerEmail,
        @NotBlank(message = "El payment source id de Wompi es obligatorio")
        String paymentSourceId,
        @Min(value = 1, message = "La cantidad de cuotas debe ser al menos 1")
        Integer installments,
        @NotBlank(message = "El acceptance token de Wompi es obligatorio")
        String acceptanceToken
) {
}
