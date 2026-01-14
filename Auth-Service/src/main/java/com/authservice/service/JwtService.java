package com.authservice.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {
    
    @Value("${app.jwt.secret}")
    private String secretKey;
    
    @Value("${app.jwt.expiration}")
    private long jwtExpiration;
    
    @Value("${app.jwt.refresh-expiration}")
    private long refreshExpiration;
    
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }
    
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }
    
    public String generateToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails);
    }
    
    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        return buildToken(extraClaims, userDetails, jwtExpiration);
    }
    
    public String generateRefreshToken(UserDetails userDetails) {
        return buildToken(new HashMap<>(), userDetails, refreshExpiration);
    }
    
    private String buildToken(
            Map<String, Object> extraClaims,
            UserDetails userDetails,
            long expiration
    ) {
        return Jwts.builder()
                .claims(extraClaims)
                .subject(userDetails.getUsername())
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSignInKey())
                .compact();
    }

        // Genera un token de servicio (sin usuario) con subject arbitrario y TTL corto
        public String generateServiceToken(String subject, long ttlMillis, Map<String, Object> extraClaims) {
        Map<String, Object> claims = extraClaims != null ? new HashMap<>(extraClaims) : new HashMap<>();
        return Jwts.builder()
            .claims(claims)
            .subject(subject)
            .issuedAt(new Date(System.currentTimeMillis()))
            .expiration(new Date(System.currentTimeMillis() + ttlMillis))
            .signWith(getSignInKey())
            .compact();
        }
    
    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername())) && !isTokenExpired(token);
    }
    
    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }
    
    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }
    
    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
    
    private SecretKey getSignInKey() {
        if (secretKey == null || secretKey.isBlank()) {
            throw new IllegalStateException("app.jwt.secret (JWT_SECRET) no está configurado");
        }

        String trimmed = secretKey.trim();

        // Importante: por compatibilidad entre microservicios, por defecto tratamos JWT_SECRET como
        // una cadena "raw" (bytes UTF-8). Esto coincide con implementaciones comunes donde el secret
        // se usa tal cual (sin decodificar).
        //
        // Si quieres usar un formato explícito, soportamos prefijos:
        // - base64:AAAA...  (decodifica base64)
        // - hex:404E...     (decodifica hex)
        byte[] keyBytes;
        if (trimmed.regionMatches(true, 0, "base64:", 0, "base64:".length())) {
            String base64 = trimmed.substring("base64:".length()).trim();
            keyBytes = Decoders.BASE64.decode(base64);
        } else if (trimmed.regionMatches(true, 0, "hex:", 0, "hex:".length())) {
            String hex = trimmed.substring("hex:".length()).trim();
            if (!hex.matches("^[0-9a-fA-F]+$") || (hex.length() % 2 != 0)) {
                throw new IllegalStateException("JWT_SECRET con prefijo hex: inválido (debe tener longitud par y solo 0-9/A-F)");
            }
            keyBytes = hexToBytes(hex);
        } else {
            keyBytes = trimmed.getBytes(StandardCharsets.UTF_8);
        }

        // HS256 requiere al menos 256 bits (32 bytes)
        if (keyBytes.length < 32) {
            throw new IllegalStateException("JWT_SECRET debe tener al menos 32 bytes (256 bits). Si usas base64/hex, usa prefijos base64: o hex:.");
        }

        return Keys.hmacShaKeyFor(keyBytes);
    }

    private static byte[] hexToBytes(String hex) {
        int len = hex.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            int hi = Character.digit(hex.charAt(i), 16);
            int lo = Character.digit(hex.charAt(i + 1), 16);
            if (hi == -1 || lo == -1) {
                throw new IllegalStateException("JWT_SECRET en formato hex inválido");
            }
            data[i / 2] = (byte) ((hi << 4) + lo);
        }
        return data;
    }
    
    public long getJwtExpiration() {
        return jwtExpiration;
    }
}
