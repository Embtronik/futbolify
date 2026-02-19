package com.payment.service.api.dto;

import com.payment.service.domain.PaymentStatus;

import java.time.OffsetDateTime;
import java.util.UUID;

public record PaymentResponse(
        UUID id,
        String reference,
        Long amountInCents,
        String currency,
        PaymentStatus status,
        String wompiTransactionId,
        String wompiStatus,
        OffsetDateTime createdAt
) {
}
