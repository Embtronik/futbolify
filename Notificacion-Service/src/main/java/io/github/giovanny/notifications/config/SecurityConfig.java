package io.github.giovanny.notifications.config;

import io.github.giovanny.notifications.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Configuración de seguridad Spring Security para el servicio de notificaciones.
 * Implementa autenticación basada en JWT validados por el Auth Service.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    /**
     * Configuración de seguridad para ambiente de desarrollo (sin autenticación).
     * Útil para pruebas locales sin necesidad de JWT.
     */
    @Configuration
    @Profile("dev")
    @Order(1)
    public static class DevSecurityConfig {
        
        @Bean
        public SecurityFilterChain devSecurityFilterChain(HttpSecurity http) throws Exception {
            http
                    .csrf(AbstractHttpConfigurer::disable)
                    .authorizeHttpRequests(auth -> auth
                            .anyRequest().permitAll()
                    )
                    .sessionManagement(session -> 
                            session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                    );
            
            return http.build();
        }
    }
    
    /**
     * Configuración de seguridad para producción (con JWT).
     * Requiere autenticación JWT para todos los endpoints de API.
     */
    @Configuration
    @Profile("!dev")
    @Order(2)
    @RequiredArgsConstructor
    public static class ProdSecurityConfig {
        
        private final JwtAuthenticationFilter jwtAuthenticationFilter;
        
        @Bean
        public SecurityFilterChain prodSecurityFilterChain(HttpSecurity http) throws Exception {
            http
                    // Deshabilitar CSRF ya que usamos JWT (stateless)
                    .csrf(AbstractHttpConfigurer::disable)
                    
                    // Configuración de autorización
                    .authorizeHttpRequests(auth -> auth
                            // Endpoints públicos (Actuator health check)
                            .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                            
                            // Endpoints de API documentación (Swagger - opcional)
                            .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                            
                            // Todos los endpoints de notificaciones requieren autenticación
                            .requestMatchers("/api/v1/notifications/**").authenticated()
                            
                            // Endpoints de administración de templates (opcional: agregar role ADMIN)
                            .requestMatchers("/api/v1/templates/**").authenticated()
                            
                            // Cualquier otra petición requiere autenticación
                            .anyRequest().authenticated()
                    )
                    
                    // Configurar sesión como STATELESS (no mantener sesión en servidor)
                    .sessionManagement(session -> 
                            session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                    )
                    
                    // Agregar filtro JWT antes del filtro de autenticación por defecto
                    .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
            
            return http.build();
        }
    }
}

