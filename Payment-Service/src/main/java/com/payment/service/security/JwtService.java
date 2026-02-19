package com.payment.service.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

@Service
public class JwtService {

    private final SecretKey secretKey;

    public JwtService(@Value("${jwt.secret}") String jwtSecret) {
        this.secretKey = Keys.hmacShaKeyFor(resolveSecret(jwtSecret));
    }

    public Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private byte[] resolveSecret(String jwtSecret) {
        if (jwtSecret != null && jwtSecret.matches("^[0-9a-fA-F]+$") && jwtSecret.length() % 2 == 0) {
            return hexToBytes(jwtSecret);
        }
        return jwtSecret.getBytes(StandardCharsets.UTF_8);
    }

    private byte[] hexToBytes(String hex) {
        int len = hex.length();
        byte[] data = new byte[len / 2];
        for (int index = 0; index < len; index += 2) {
            data[index / 2] = (byte) ((Character.digit(hex.charAt(index), 16) << 4)
                    + Character.digit(hex.charAt(index + 1), 16));
        }
        return data;
    }
}
