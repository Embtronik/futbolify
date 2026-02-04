package com.authservice.security;

import com.authservice.model.User;
import com.authservice.service.TermsService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class TermsAcceptanceFilter extends OncePerRequestFilter {

    private final TermsService termsService;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        String path = request.getRequestURI();

        // Allow these paths without terms enforcement.
        if (isExcludedPath(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            filterChain.doFilter(request, response);
            return;
        }

        Object principal = authentication.getPrincipal();
        if (!(principal instanceof User user)) {
            filterChain.doFilter(request, response);
            return;
        }

        boolean accepted = termsService.hasAcceptedActiveTerms(user.getId());
        if (accepted) {
            filterChain.doFilter(request, response);
            return;
        }

        var status = termsService.getStatus(user.getId());

        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", false);
        body.put("message", "Debe aceptar los términos y condiciones para continuar");
        body.put("requiredTermsVersion", status.getRequiredTermsVersion());

        response.getWriter().write(objectMapper.writeValueAsString(body));
    }

    private boolean isExcludedPath(String path) {
        if (path == null) return true;

        return path.startsWith("/api/v1/auth/")
                || path.startsWith("/api/v1/terms/")
                || path.startsWith("/oauth2/")
                || path.startsWith("/login/oauth2/")
                || path.startsWith("/actuator/")
                || path.equals("/error");
    }
}
