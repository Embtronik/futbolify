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
     * Valida un token JWT consultando al Auth Service y devuelve
     * la respuesta completa con información del usuario.
     * 
     * @param token Token JWT (sin el prefijo "Bearer ")
     * @return TokenValidationResponse con el resultado de la validación
     */
    public TokenValidationResponse validateToken(String token) {
        if (!authServiceProperties.getEnabled()) {
            log.warn("Auth service validation is disabled - accepting all tokens");
            // En este caso marcamos el token como válido pero sin usuario conocido
            return new TokenValidationResponse(true, "unknown", null, null);
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
                return response;
            } else {
                log.warn("Token validation failed: invalid token");
                return new TokenValidationResponse(false, null, null, null);
            }

        } catch (Exception e) {
            log.error("Error validating token with auth service: {}", e.getMessage());
            return new TokenValidationResponse(false, null, null, null);
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
