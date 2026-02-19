package com.payment.service.service;

import com.payment.service.api.dto.CreatePaymentRequest;
import com.payment.service.api.dto.PaymentResponse;
import com.payment.service.config.WompiProperties;
import com.payment.service.domain.PaymentStatus;
import com.payment.service.domain.PaymentTransaction;
import com.payment.service.exception.DuplicatePaymentReferenceException;
import com.payment.service.exception.ResourceNotFoundException;
import com.payment.service.integration.WompiClient;
import com.payment.service.repository.PaymentTransactionRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
public class PaymentService {

    private final PaymentTransactionRepository repository;
    private final WompiClient wompiClient;
    private final WompiSignatureService wompiSignatureService;
    private final WompiProperties wompiProperties;
    private final PaymentEventPublisher paymentEventPublisher;
    private final ObjectMapper objectMapper;

    public PaymentService(
            PaymentTransactionRepository repository,
            WompiClient wompiClient,
            WompiSignatureService wompiSignatureService,
            WompiProperties wompiProperties,
            PaymentEventPublisher paymentEventPublisher,
            ObjectMapper objectMapper
    ) {
        this.repository = repository;
        this.wompiClient = wompiClient;
        this.wompiSignatureService = wompiSignatureService;
        this.wompiProperties = wompiProperties;
        this.paymentEventPublisher = paymentEventPublisher;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public PaymentResponse createPayment(CreatePaymentRequest request) {
        if (repository.existsByReference(request.reference())) {
            throw new DuplicatePaymentReferenceException(request.reference());
        }

        PaymentTransaction payment = new PaymentTransaction();
        payment.setReference(request.reference());
        payment.setAmountInCents(request.amountInCents());
        payment.setCurrency(request.currency());
        payment.setCustomerEmail(request.customerEmail());
        payment.setStatus(PaymentStatus.PENDING);

        String signature = wompiSignatureService.generate(
                request.reference(),
                request.amountInCents(),
                request.currency(),
                wompiProperties.resolveIntegrityKey()
        );

        Map<String, Object> payload = Map.of(
                "amount_in_cents", request.amountInCents(),
                "currency", request.currency(),
                "customer_email", request.customerEmail(),
                "payment_method", Map.of("installments", request.installments()),
                "reference", request.reference(),
                "payment_source_id", request.paymentSourceId(),
                "acceptance_token", request.acceptanceToken(),
                "signature", signature
        );

        Map<String, Object> wompiResponse = wompiClient.createTransaction(payload);
        Map<String, Object> data = extractData(wompiResponse);

        payment.setWompiTransactionId(stringValue(data.get("id")));
        payment.setWompiStatus(stringValue(data.get("status")));
        payment.setStatus(resolveStatus(payment.getWompiStatus()));
        payment.setRawResponse(toJson(wompiResponse));

        PaymentTransaction saved = repository.save(payment);
        paymentEventPublisher.publishPaymentCreated(saved);
        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public PaymentResponse getById(UUID id) {
        PaymentTransaction payment = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No existe el pago con id: " + id));
        return mapToResponse(payment);
    }

    @Transactional(readOnly = true)
    public PaymentResponse getByReference(String reference) {
        PaymentTransaction payment = repository.findByReference(reference)
                .orElseThrow(() -> new ResourceNotFoundException("No existe el pago con referencia: " + reference));
        return mapToResponse(payment);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractData(Map<String, Object> wompiResponse) {
        Object data = wompiResponse.get("data");
        if (data instanceof Map<?, ?> mapData) {
            return (Map<String, Object>) mapData;
        }
        return Map.of();
    }

    private String toJson(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }

    private String stringValue(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private PaymentStatus resolveStatus(String wompiStatus) {
        if (wompiStatus == null) {
            return PaymentStatus.ERROR;
        }
        return switch (wompiStatus.toUpperCase()) {
            case "APPROVED" -> PaymentStatus.APPROVED;
            case "DECLINED", "VOIDED", "ERROR" -> PaymentStatus.DECLINED;
            default -> PaymentStatus.PENDING;
        };
    }

    private PaymentResponse mapToResponse(PaymentTransaction payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getReference(),
                payment.getAmountInCents(),
                payment.getCurrency(),
                payment.getStatus(),
                payment.getWompiTransactionId(),
                payment.getWompiStatus(),
                payment.getCreatedAt()
        );
    }
}
