package com.teamsservice.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Interceptor que agrega el JWT token a las peticiones HTTP salientes
 * Extrae el token del SecurityContext y lo agrega al header Authorization
 */
@Component
@Slf4j
public class JwtForwardingInterceptor implements ClientHttpRequestInterceptor {

    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.getCredentials() != null) {
            String token = authentication.getCredentials().toString();
            log.debug("Forwarding JWT token to request: {} {}", request.getMethod(), request.getURI());
            request.getHeaders().add("Authorization", "Bearer " + token);
        } else {
            log.warn("No JWT token found in SecurityContext for request: {} {}", request.getMethod(), request.getURI());
        }
        
        return execution.execute(request, body);
    }
}
