package com.teamsservice.service;

import com.teamsservice.dto.PaymentValidationRequest;
import com.teamsservice.dto.PaymentValidationResponse;
import com.teamsservice.exception.BusinessRuleException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

/**
 * Cliente para comunicarse con el payment-service para validar pagos de pollas públicas.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentServiceClient {

    private final RestTemplate restTemplate;

    @Value("${app.payment-service.url:http://localhost:8083}")
    private String paymentServiceUrl;

    @Value("${app.payment-service.enabled:false}")
    private boolean paymentServiceEnabled;

    /**
     * Valida un pago con el servicio de pagos.
     * 
     * @param request Datos de la solicitud de validación
     * @return Response con el resultado de la validación
     * @throws BusinessRuleException si el pago no es válido o hay error en la comunicación
     */
    public PaymentValidationResponse validatePayment(PaymentValidationRequest request) {
        // Si el servicio de pagos está deshabilitado (para desarrollo), auto-aprobar
        if (!paymentServiceEnabled) {
            log.warn("Payment service is disabled. Auto-approving payment for user {} and polla {}", 
                    request.getUserEmail(), request.getPollaId());
            return PaymentValidationResponse.builder()
                    .valid(true)
                    .paymentId("DEV-" + System.currentTimeMillis())
                    .paymentReference(request.getPaymentReference())
                    .amount(request.getExpectedAmount())
                    .status("APPROVED")
                    .message("Auto-approved in development mode")
                    .build();
        }

        String url = paymentServiceUrl + "/api/v1/payments/validate";
        
        try {
            log.info("Validating payment with payment-service: user={}, reference={}, amount={}", 
                    request.getUserEmail(), request.getPaymentReference(), request.getExpectedAmount());
            
            ResponseEntity<PaymentValidationResponse> response = restTemplate.postForEntity(
                    url, request, PaymentValidationResponse.class);
            
            PaymentValidationResponse validationResponse = response.getBody();
            
            if (validationResponse == null) {
                throw new BusinessRuleException("No se recibió respuesta del servicio de pagos");
            }
            
            if (!validationResponse.isValid() || !"APPROVED".equals(validationResponse.getStatus())) {
                throw new BusinessRuleException(
                    "Pago no válido: " + validationResponse.getMessage());
            }
            
            log.info("Payment validated successfully: paymentId={}, status={}", 
                    validationResponse.getPaymentId(), validationResponse.getStatus());
            
            return validationResponse;
            
        } catch (HttpClientErrorException e) {
            log.error("Payment validation failed with HTTP error: status={}, response={}", 
                    e.getStatusCode(), e.getResponseBodyAsString());
            
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                throw new BusinessRuleException("Pago no encontrado o referencia inválida");
            } else if (e.getStatusCode() == HttpStatus.BAD_REQUEST) {
                throw new BusinessRuleException("Datos de pago inválidos");
            } else {
                throw new BusinessRuleException("Error al validar el pago: " + e.getMessage());
            }
            
        } catch (RestClientException e) {
            log.error("Error communicating with payment service at {}: {}", url, e.getMessage());
            throw new BusinessRuleException(
                "No se pudo conectar con el servicio de pagos. Intente más tarde.");
        }
    }

    /**
     * Verifica si un usuario ya tiene un pago aprobado para una polla específica.
     * 
     * @param userEmail Email del usuario
     * @param pollaId ID de la polla
     * @return true si existe un pago aprobado
     */
    public boolean hasApprovedPayment(String userEmail, Long pollaId) {
        // Si el servicio de pagos está deshabilitado, retornar true (sin restricción)
        if (!paymentServiceEnabled) {
            log.warn("Payment service is disabled. Assuming payment exists for user {} and polla {}", 
                    userEmail, pollaId);
            return true;
        }

        String url = paymentServiceUrl + "/api/v1/payments/check?userEmail={userEmail}&pollaId={pollaId}";
        
        try {
            ResponseEntity<Boolean> response = restTemplate.getForEntity(
                    url, Boolean.class, userEmail, pollaId);
            
            Boolean hasPayment = response.getBody();
            log.info("Payment check for user {} and polla {}: {}", userEmail, pollaId, hasPayment);
            
            return hasPayment != null && hasPayment;
            
        } catch (RestClientException e) {
            log.error("Error checking payment for user {} and polla {}: {}", 
                    userEmail, pollaId, e.getMessage());
            // En caso de error, denegar por seguridad
            return false;
        }
    }
}
