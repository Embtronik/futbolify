package com.teamsservice.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Component
@Slf4j
public class JwtTokenProvider {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    private SecretKey getSigningKey() {
        log.debug("Using JWT secret (first 20 chars): {}...", jwtSecret.substring(0, Math.min(20, jwtSecret.length())));
        log.debug("JWT secret length: {}", jwtSecret.length());
        
        // Decodificar el secreto de BASE64 (igual que auth-service)
        byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
        log.debug("Decoded key bytes length: {}", keyBytes.length);
        
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public Claims getClaimsFromToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public Long getUserIdFromToken(String token) {
        Claims claims = getClaimsFromToken(token);
        Object userIdObj = claims.get("userId");
        
        if (userIdObj instanceof Integer) {
            return ((Integer) userIdObj).longValue();
        } else if (userIdObj instanceof Long) {
            return (Long) userIdObj;
        } else if (userIdObj == null) {
            // Si no hay userId en claims, intentar extraer del subject (email)
            // y buscar el usuario en la base de datos
            String subject = claims.getSubject();
            log.warn("No userId claim found in token, subject: {}", subject);
            // Por ahora retornamos null y lo manejamos en el filter
            return null;
        }
        
        throw new IllegalArgumentException("Invalid userId in token");
    }

    public String getEmailFromToken(String token) {
        Claims claims = getClaimsFromToken(token);
        String email = claims.get("email", String.class);
        
        // Si no hay email en claims, usar el subject
        if (email == null) {
            email = claims.getSubject();
            log.debug("No email claim found, using subject: {}", email);
        }
        
        return email;
    }

    public List<GrantedAuthority> getAuthoritiesFromToken(String token) {
        Claims claims = getClaimsFromToken(token);
        List<?> roles = claims.get("roles", List.class);
        
        List<GrantedAuthority> authorities = new ArrayList<>();
        if (roles != null) {
            for (Object role : roles) {
                authorities.add(new SimpleGrantedAuthority("ROLE_" + role.toString()));
            }
        }
        
        return authorities;
    }

    public boolean validateToken(String token) {
        try {
            Claims claims = getClaimsFromToken(token);
            Date expiration = claims.getExpiration();
            boolean isValid = !expiration.before(new Date());
            log.debug("Token validation result: {}", isValid);
            return isValid;
        } catch (io.jsonwebtoken.security.SignatureException e) {
            log.error("Invalid JWT signature: {}", e.getMessage());
            log.error("This usually means the JWT_SECRET doesn't match between auth-service and teams-service");
            return false;
        } catch (io.jsonwebtoken.MalformedJwtException e) {
            log.error("Malformed JWT token: {}", e.getMessage());
            return false;
        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            log.error("Expired JWT token: {}", e.getMessage());
            return false;
        } catch (io.jsonwebtoken.UnsupportedJwtException e) {
            log.error("Unsupported JWT token: {}", e.getMessage());
            return false;
        } catch (IllegalArgumentException e) {
            log.error("JWT claims string is empty: {}", e.getMessage());
            return false;
        } catch (Exception e) {
            log.error("Invalid JWT token - Unexpected error: {} - {}", e.getClass().getName(), e.getMessage());
            return false;
        }
    }
}
