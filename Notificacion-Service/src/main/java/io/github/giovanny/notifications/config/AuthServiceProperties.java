package io.github.giovanny.notifications.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;

/**
 * Propiedades de configuración para integración con Auth Service.
 */
@Data
@Validated
@Configuration
@ConfigurationProperties(prefix = "auth-service")
public class AuthServiceProperties {
    
    /**
     * URL base del servicio de autenticación.
     * Ejemplo: http://localhost:8081 o https://auth.example.com
     */
    @NotBlank(message = "Auth service URL is required")
    private String url;
    
    /**
     * Endpoint para validar tokens JWT.
     * Default: /api/v1/auth/validate
     */
    private String validateTokenEndpoint = "/api/v1/auth/validate";
    
    /**
     * Timeout de conexión en milisegundos.
     */
    private Integer connectionTimeout = 5000;
    
    /**
     * Timeout de lectura en milisegundos.
     */
    private Integer readTimeout = 5000;
    
    /**
     * Número de reintentos en caso de fallo.
     */
    private Integer maxRetries = 2;
    
    /**
     * Indica si está habilitada la validación de tokens.
     * En desarrollo puede deshabilitarse para testing.
     */
    private Boolean enabled = true;
}
