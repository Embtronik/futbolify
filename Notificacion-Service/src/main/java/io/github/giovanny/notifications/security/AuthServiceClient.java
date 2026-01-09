package io.github.giovanny.notifications.security;

import io.github.giovanny.notifications.config.AuthServiceProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

import java.time.Duration;

/**
 * Cliente para comunicación con el Auth Service para validación de tokens JWT.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AuthServiceClient {
    
    private final WebClient webClient;
    private final AuthServiceProperties authServiceProperties;
    
    /**
     * Valida un token JWT consultando al Auth Service.
     * 
     * @param token Token JWT (sin el prefijo "Bearer ")
     * @return true si el token es válido, false en caso contrario
     */
    public boolean validateToken(String token) {
        if (!authServiceProperties.getEnabled()) {
            log.warn("Auth service validation is disabled - accepting all tokens");
            return true;
        }
        
        try {
            String url = authServiceProperties.getUrl() + authServiceProperties.getValidateTokenEndpoint();
            
            TokenValidationResponse response = webClient.post()
                    .uri(url)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .retrieve()
                    .onStatus(
                            status -> status.equals(HttpStatus.UNAUTHORIZED) || status.equals(HttpStatus.FORBIDDEN),
                            clientResponse -> {
                                log.warn("Token validation failed with status: {}", clientResponse.statusCode());
                                return Mono.empty();
                            }
                    )
                    .bodyToMono(TokenValidationResponse.class)
                    .retryWhen(Retry.fixedDelay(
                            authServiceProperties.getMaxRetries(),
                            Duration.ofMillis(500)
                    ))
                    .timeout(Duration.ofMillis(authServiceProperties.getReadTimeout()))
                    .block();
            
            boolean isValid = response != null && response.isValid();
            
            if (isValid) {
                log.debug("Token validated successfully for user: {}", response.getUsername());
            } else {
                log.warn("Token validation failed: invalid token");
            }
            
            return isValid;
            
        } catch (Exception e) {
            log.error("Error validating token with auth service: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * Extrae el username del token (sin validar).
     * Para uso después de validación exitosa.
     * 
     * @param token Token JWT
     * @return Username extraído del token
     */
    public String extractUsername(String token) {
        try {
            String url = authServiceProperties.getUrl() + authServiceProperties.getValidateTokenEndpoint();
            
            TokenValidationResponse response = webClient.post()
                    .uri(url)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                    .retrieve()
                    .bodyToMono(TokenValidationResponse.class)
                    .timeout(Duration.ofMillis(authServiceProperties.getReadTimeout()))
                    .block();
            
            return response != null ? response.getUsername() : "unknown";
            
        } catch (Exception e) {
            log.error("Error extracting username from token: {}", e.getMessage());
            return "unknown";
        }
    }
    
    /**
     * DTO para la respuesta de validación de token del Auth Service.
     */
    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class TokenValidationResponse {
        private boolean valid;
        private String username;
        private String email;
        private Long userId;
    }
}
