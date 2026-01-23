package com.teamsservice.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.lang.NonNull;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    private final JwtTokenProvider tokenProvider;

    public JwtAuthenticationFilter(JwtTokenProvider tokenProvider) {
        this.tokenProvider = tokenProvider;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        
        try {
            String jwt = getJwtFromRequest(request);
            
            if (StringUtils.hasText(jwt)) {
                log.debug("JWT Token received (first 20 chars): {}...", jwt.substring(0, Math.min(20, jwt.length())));
                log.debug("JWT Token length: {}", jwt.length());
            }

            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                Long userId = tokenProvider.getUserIdFromToken(jwt);
                String email = tokenProvider.getEmailFromToken(jwt);
                List<GrantedAuthority> authorities = tokenProvider.getAuthoritiesFromToken(jwt);

                // OAuth tokens may not include a numeric userId.
                // To avoid collisions (many users would become userId=0) we derive a stable per-email id.
                if (userId == null || userId == 0L) {
                    Long derived = deriveStableUserIdFromEmail(email);
                    if (derived != null) {
                        userId = derived;
                        log.warn("No userId in token; derived stable userId from email. Email: {}", email);
                    } else {
                        userId = 0L;
                        log.warn("No userId and no email in token; using placeholder userId=0");
                    }
                }

                UserPrincipal userPrincipal = new UserPrincipal(userId, email, authorities);

                // Guardar el JWT token en credentials para poder reenviarlo en peticiones inter-servicio
                UsernamePasswordAuthenticationToken authentication = 
                    new UsernamePasswordAuthenticationToken(userPrincipal, jwt, authorities);
                
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
                
                log.debug("Set authentication for user: {} with JWT token", email);
            }
        } catch (Exception ex) {
            log.error("Could not set user authentication in security context", ex);
        }

        filterChain.doFilter(request, response);
    }

    private static Long deriveStableUserIdFromEmail(String email) {
        if (!StringUtils.hasText(email)) {
            return null;
        }

        String normalized = email.trim().toLowerCase();
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(normalized.getBytes(StandardCharsets.UTF_8));
            long value = ByteBuffer.wrap(hash, 0, Long.BYTES).getLong();
            value = value & Long.MAX_VALUE; // keep positive
            if (value == 0L) {
                value = 1L;
            }
            return value;
        } catch (NoSuchAlgorithmException e) {
            // Should never happen on a standard JRE.
            return null;
        }
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        
        return null;
    }
}
