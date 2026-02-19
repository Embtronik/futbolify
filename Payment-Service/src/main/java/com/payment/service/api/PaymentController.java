package com.payment.service.api;

import com.payment.service.api.dto.CreatePaymentRequest;
import com.payment.service.api.dto.PaymentResponse;
import com.payment.service.api.dto.PaymentValidationRequest;
import com.payment.service.api.dto.PaymentValidationResponse;
import com.payment.service.service.PaymentService;
import com.payment.service.service.PaymentValidationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payments")
public class PaymentController {

    private final PaymentService paymentService;
    private final PaymentValidationService paymentValidationService;

    public PaymentController(PaymentService paymentService, PaymentValidationService paymentValidationService) {
        this.paymentService = paymentService;
        this.paymentValidationService = paymentValidationService;
    }

    @PostMapping("/transactions")
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentResponse create(@Valid @RequestBody CreatePaymentRequest request) {
        return paymentService.createPayment(request);
    }

    @GetMapping("/{id}")
    public PaymentResponse getById(@PathVariable UUID id) {
        return paymentService.getById(id);
    }

    @GetMapping("/reference/{reference}")
    public PaymentResponse getByReference(@PathVariable String reference) {
        return paymentService.getByReference(reference);
    }

    @PostMapping("/validate")
    public PaymentValidationResponse validatePayment(@Valid @RequestBody PaymentValidationRequest request) {
        return paymentValidationService.validate(request);
    }

    @GetMapping("/check")
    public boolean checkPayment(@RequestParam String userEmail, @RequestParam Long pollaId) {
        return paymentValidationService.hasApprovedPayment(userEmail, pollaId);
    }
}
