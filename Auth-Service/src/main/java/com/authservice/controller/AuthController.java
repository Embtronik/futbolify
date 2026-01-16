package com.authservice.controller;

import com.authservice.dto.*;
import com.authservice.model.User;
import com.authservice.repository.UserRepository;
import com.authservice.service.AuthService;
import com.authservice.service.JwtService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {
    
    private final AuthService authService;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }
    
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }
    
    @GetMapping("/verify-email")
    public ResponseEntity<MessageResponse> verifyEmail(@RequestParam String token) {
        authService.verifyEmail(token);
        return ResponseEntity.ok(
                MessageResponse.builder()
                        .message("Email verified successfully")
                        .success(true)
                        .build()
        );
    }
    
    @PostMapping("/resend-verification")
    public ResponseEntity<MessageResponse> resendVerification(@RequestParam String email) {
        authService.resendVerificationEmail(email);
        return ResponseEntity.ok(
                MessageResponse.builder()
                        .message("Verification email sent successfully")
                        .success(true)
                        .build()
        );
    }
    
    @PostMapping("/refresh-token")
    public ResponseEntity<AuthResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refreshToken(request.getRefreshToken()));
    }

    @PostMapping("/validate")
    public ResponseEntity<ValidateTokenResponse> validateToken(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        ValidateTokenResponse invalid = ValidateTokenResponse.builder()
                .valid(false)
                .username(null)
                .email(null)
                .userId(null)
                .build();

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.ok(invalid);
        }

        String token = authorization.substring("Bearer ".length()).trim();
        if (token.isEmpty()) {
            return ResponseEntity.ok(invalid);
        }

        try {
            String email = jwtService.extractUsername(token);
            if (email == null || email.isBlank()) {
                return ResponseEntity.ok(invalid);
            }

            User user = userRepository.findByEmail(email).orElse(null);
            if (user == null) {
                return ResponseEntity.ok(invalid);
            }

            boolean valid = jwtService.isTokenValid(token, user);
            if (!valid) {
                return ResponseEntity.ok(invalid);
            }

            String username = user.getFirstName();
            if (username == null || username.isBlank()) {
                int at = email.indexOf('@');
                username = at > 0 ? email.substring(0, at) : email;
            }

            return ResponseEntity.ok(ValidateTokenResponse.builder()
                    .valid(true)
                    .username(username)
                    .email(email)
                    .userId(user.getId())
                    .build());
        } catch (RuntimeException ex) {
            return ResponseEntity.ok(invalid);
        }
    }
}
