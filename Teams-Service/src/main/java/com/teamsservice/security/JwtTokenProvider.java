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

    // Toggle to control if the secret is Base64-encoded when no prefix is provided (default false).
    // Prefer explicit prefixes: base64:... or hex:...
    @Value("${app.jwt.decode-base64:false}")
    private boolean decodeBase64;

    private SecretKey getSigningKey() {
        log.debug("Using JWT secret (first 20 chars): {}...", jwtSecret.substring(0, Math.min(20, jwtSecret.length())));
        log.debug("JWT secret length: {}", jwtSecret.length());

        byte[] keyBytes;
        String trimmed = jwtSecret != null ? jwtSecret.trim() : "";

        // Prefix handling aligned with auth-service:
        // - base64:AAAA...
        // - hex:404E...
        if (trimmed.regionMatches(true, 0, "base64:", 0, "base64:".length())) {
            String base64 = trimmed.substring("base64:".length()).trim();
            keyBytes = Decoders.BASE64.decode(base64);
            log.debug("Decoded via base64: prefix, key bytes length: {}", keyBytes.length);
        } else if (trimmed.regionMatches(true, 0, "hex:", 0, "hex:".length())) {
            String hex = trimmed.substring("hex:".length()).trim();
            if (!hex.matches("^[0-9a-fA-F]+$") || (hex.length() % 2 != 0)) {
                throw new IllegalStateException("JWT_SECRET with hex: prefix is invalid (must be even length and hex-only)");
            }
            keyBytes = hexToBytes(hex);
            log.debug("Decoded via hex: prefix, key bytes length: {}", keyBytes.length);
        } else if (decodeBase64) {
            // Backward-compatibility fallback: treat as Base64 if property explicitly enabled
            keyBytes = Decoders.BASE64.decode(trimmed);
            log.debug("Decoded via property decode-base64=true, key bytes length: {}", keyBytes.length);
        } else {
            // Default: raw UTF-8 bytes
            keyBytes = trimmed.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            log.debug("Using RAW key bytes length: {}", keyBytes.length);
        }

        // Minimum sanity check (HS256 requires >= 32 bytes). HS512 may require >= 64 bytes; JJWT will enforce.
        if (keyBytes.length < 32) {
            throw new IllegalStateException("JWT_SECRET must be at least 32 bytes. Use prefixes base64: or hex: if needed.");
        }

        return Keys.hmacShaKeyFor(keyBytes);
    }

    private static byte[] hexToBytes(String hex) {
        int len = hex.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(hex.charAt(i), 16) << 4)
                    + Character.digit(hex.charAt(i + 1), 16));
        }
        return data;
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
