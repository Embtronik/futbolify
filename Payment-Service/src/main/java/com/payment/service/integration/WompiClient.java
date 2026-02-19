package com.payment.service.integration;

import com.payment.service.config.WompiProperties;
import com.payment.service.exception.ExternalPaymentGatewayException;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class WompiClient {

    private final RestClient restClient;
    private final WompiProperties wompiProperties;

    public WompiClient(RestClient.Builder restClientBuilder, WompiProperties wompiProperties) {
        this.restClient = restClientBuilder.baseUrl(wompiProperties.getBaseUrl()).build();
        this.wompiProperties = wompiProperties;
    }

    public Map<String, Object> createTransaction(Map<String, Object> payload) {
        try {
            return restClient.post()
                    .uri("/v1/transactions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + wompiProperties.resolvePrivateKey())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {
                    });
        } catch (Exception ex) {
            throw new ExternalPaymentGatewayException("Error al crear la transacción en Wompi", ex);
        }
    }
}
