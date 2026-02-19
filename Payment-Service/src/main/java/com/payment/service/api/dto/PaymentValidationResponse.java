package com.payment.service.api.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record PaymentValidationResponse(
        boolean valid,
        String paymentId,
        String paymentReference,
        BigDecimal amount,
        String status,
        OffsetDateTime paymentDate,
        String message
) {
}
