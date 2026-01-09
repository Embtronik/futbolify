package com.authservice.service;

import com.authservice.dto.AuthResponse;
import com.authservice.dto.LoginRequest;
import com.authservice.dto.RegisterRequest;
import com.authservice.exception.BadRequestException;
import com.authservice.exception.ResourceNotFoundException;
import com.authservice.model.*;
import com.authservice.repository.RefreshTokenRepository;
import com.authservice.repository.UserRepository;
import com.authservice.repository.VerificationTokenRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {
    
    private final UserRepository userRepository;
    private final VerificationTokenRepository verificationTokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final AuthenticationManager authenticationManager;
    
    @Value("${app.email.verification.expiration}")
    private long verificationExpiration;
    
    @Value("${app.jwt.refresh-expiration}")
    private long refreshExpiration;
    
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already registered");
        }
        
        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .countryCode(request.getCountryCode())
                .phoneNumber(request.getPhoneNumber())
                .provider(AuthProvider.LOCAL)
                .emailVerified(false)
                .role(Role.USER)
                .build();
        
        userRepository.save(user);
        
        // Create verification token
        String verificationToken = UUID.randomUUID().toString();
        VerificationToken token = VerificationToken.builder()
                .token(verificationToken)
                .user(user)
                .expiryDate(LocalDateTime.now().plusSeconds(verificationExpiration / 1000))
                .build();
        
        verificationTokenRepository.save(token);
        
        // Send verification email
        try {
            emailService.sendVerificationEmail(user, verificationToken);
        } catch (Exception e) {
            // Log error but don't fail registration
            e.printStackTrace();
        }
        
        return buildAuthResponse(user);
    }
    
    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );
        
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        return buildAuthResponse(user);
    }
    
    @Transactional
    public void verifyEmail(String token) {
        VerificationToken verificationToken = verificationTokenRepository.findByToken(token)
                .orElseThrow(() -> new BadRequestException("Invalid verification token"));
        
        if (verificationToken.isUsed()) {
            throw new BadRequestException("Token already used");
        }
        
        if (verificationToken.isExpired()) {
            throw new BadRequestException("Token expired");
        }
        
        User user = verificationToken.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);
        
        verificationToken.setUsed(true);
        verificationTokenRepository.save(verificationToken);
        
        // Send welcome email
        try {
            emailService.sendWelcomeEmail(user);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    
    @Transactional
    public AuthResponse refreshToken(String refreshToken) {
        RefreshToken token = refreshTokenRepository.findByToken(refreshToken)
                .orElseThrow(() -> new BadRequestException("Invalid refresh token"));
        
        if (token.isRevoked()) {
            throw new BadRequestException("Token has been revoked");
        }
        
        if (token.isExpired()) {
            throw new BadRequestException("Token expired");
        }
        
        User user = token.getUser();
        return buildAuthResponse(user);
    }
    
    @Transactional
    public AuthResponse processOAuth2User(User user) {
        return buildAuthResponse(user);
    }
    
    private AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtService.generateToken(user);
        String refreshToken = createRefreshToken(user);
        
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtService.getJwtExpiration())
                .user(AuthResponse.UserInfo.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .firstName(user.getFirstName())
                        .lastName(user.getLastName())
                        .emailVerified(user.isEmailVerified())
                        .provider(user.getProvider().name())
                        .build())
                .build();
    }
    
    private String createRefreshToken(User user) {
        String tokenValue = UUID.randomUUID().toString();
        
        RefreshToken refreshToken = RefreshToken.builder()
                .token(tokenValue)
                .user(user)
                .expiryDate(LocalDateTime.now().plusSeconds(refreshExpiration / 1000))
                .build();
        
        refreshTokenRepository.save(refreshToken);
        return tokenValue;
    }
    
    @Transactional
    public void resendVerificationEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        if (user.isEmailVerified()) {
            throw new BadRequestException("Email already verified");
        }
        
        // Delete old tokens
        verificationTokenRepository.deleteByUserId(user.getId());
        
        // Create new token
        String verificationToken = UUID.randomUUID().toString();
        VerificationToken token = VerificationToken.builder()
                .token(verificationToken)
                .user(user)
                .expiryDate(LocalDateTime.now().plusSeconds(verificationExpiration / 1000))
                .build();
        
        verificationTokenRepository.save(token);
        
        // Send verification email
        try {
            emailService.sendVerificationEmail(user, verificationToken);
        } catch (Exception e) {
            throw new RuntimeException("Failed to send email", e);
        }
    }
}
