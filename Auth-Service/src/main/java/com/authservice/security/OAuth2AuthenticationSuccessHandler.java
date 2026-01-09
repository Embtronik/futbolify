package com.authservice.security;

import com.authservice.model.User;
import com.authservice.repository.UserRepository;
import com.authservice.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {
    
    private final AuthService authService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    
    public OAuth2AuthenticationSuccessHandler(
        @Lazy AuthService authService,
        UserRepository userRepository,
        ObjectMapper objectMapper
    ) {
        this.authService = authService;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }
    
    @Value("${app.frontend.url}")
    private String frontendUrl;
    
    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException, ServletException {
        OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();
        String email = oauth2User.getAttribute("email");
        
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        var authResponse = authService.processOAuth2User(user);
        
        String targetUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/oauth2/redirect")
                .queryParam("token", authResponse.getAccessToken())
                .queryParam("refreshToken", authResponse.getRefreshToken())
                .build().toUriString();
        
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
