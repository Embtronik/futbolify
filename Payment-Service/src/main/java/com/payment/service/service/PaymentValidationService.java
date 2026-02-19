package com.payment.service.service;

import com.payment.service.api.dto.PaymentValidationRequest;
import com.payment.service.api.dto.PaymentValidationResponse;
import com.payment.service.domain.PaymentStatus;
import com.payment.service.domain.PaymentTransaction;
import com.payment.service.repository.PaymentTransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class PaymentValidationService {

    private final PaymentTransactionRepository repository;

    public PaymentValidationService(PaymentTransactionRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public PaymentValidationResponse validate(PaymentValidationRequest request) {
        PaymentTransaction payment = repository.findByReference(request.paymentReference())
                .orElse(null);

        if (payment == null) {
            return invalidResponse(request, "Pago no encontrado");
        }

        if (payment.getStatus() != PaymentStatus.APPROVED) {
            return new PaymentValidationResponse(
                    false,
                    payment.getId().toString(),
                    payment.getReference(),
                    amountToDecimal(payment.getAmountInCents()),
                    payment.getStatus().name(),
                    payment.getCreatedAt(),
                    "Pago no aprobado"
            );
        }

        if (!matchesAmount(payment.getAmountInCents(), request.expectedAmount())) {
            return new PaymentValidationResponse(
                    false,
                    payment.getId().toString(),
                    payment.getReference(),
                    amountToDecimal(payment.getAmountInCents()),
                    payment.getStatus().name(),
                    payment.getCreatedAt(),
                    "El monto del pago no coincide con el monto esperado"
            );
        }

        if (payment.getPollaId() != null && !payment.getPollaId().equals(request.pollaId())) {
            return new PaymentValidationResponse(
                    false,
                    payment.getId().toString(),
                    payment.getReference(),
                    amountToDecimal(payment.getAmountInCents()),
                    payment.getStatus().name(),
                    payment.getCreatedAt(),
                    "La referencia de pago ya fue usada para otra polla"
            );
        }

        payment.setCustomerEmail(request.userEmail());
        payment.setPollaId(request.pollaId());
        payment.setConcept(request.concept());
        repository.save(payment);

        return new PaymentValidationResponse(
                true,
                payment.getId().toString(),
                payment.getReference(),
                amountToDecimal(payment.getAmountInCents()),
                payment.getStatus().name(),
                payment.getCreatedAt(),
                "Pago aprobado exitosamente"
        );
    }

    @Transactional(readOnly = true)
    public boolean hasApprovedPayment(String userEmail, Long pollaId) {
        return repository.existsByCustomerEmailIgnoreCaseAndPollaIdAndStatus(userEmail, pollaId, PaymentStatus.APPROVED);
    }

    private boolean matchesAmount(Long amountInCents, BigDecimal expectedAmount) {
        BigDecimal storedAsCurrency = amountToDecimal(amountInCents);
        BigDecimal storedAsIntegerAmount = BigDecimal.valueOf(amountInCents).setScale(2, RoundingMode.HALF_UP);
        BigDecimal expected = expectedAmount.setScale(2, RoundingMode.HALF_UP);
        return storedAsCurrency.compareTo(expected) == 0 || storedAsIntegerAmount.compareTo(expected) == 0;
    }

    private BigDecimal amountToDecimal(Long amountInCents) {
        return BigDecimal.valueOf(amountInCents)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }

    private PaymentValidationResponse invalidResponse(PaymentValidationRequest request, String message) {
        return new PaymentValidationResponse(
                false,
                null,
                request.paymentReference(),
                request.expectedAmount().setScale(2, RoundingMode.HALF_UP),
                "NOT_FOUND",
                null,
                message
        );
    }
}
