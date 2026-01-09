package com.authservice.security;

import com.authservice.model.AuthProvider;
import com.authservice.model.Role;
import com.authservice.model.User;
import com.authservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {
    
    private final UserRepository userRepository;
    
    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oauth2User = super.loadUser(userRequest);
        
        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        Map<String, Object> attributes = oauth2User.getAttributes();
        
        User user = processOAuth2User(registrationId, attributes);
        
        return new DefaultOAuth2User(
                Collections.singleton(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())),
                attributes,
                "email"
        );
    }
    
    private User processOAuth2User(String registrationId, Map<String, Object> attributes) {
        String email = (String) attributes.get("email");
        String providerId = (String) attributes.get("sub");
        String firstName = (String) attributes.get("given_name");
        String lastName = (String) attributes.get("family_name");
        
        return userRepository.findByEmail(email)
                .map(existingUser -> updateExistingUser(existingUser, attributes))
                .orElseGet(() -> createNewUser(registrationId, email, providerId, firstName, lastName));
    }
    
    private User createNewUser(String provider, String email, String providerId, String firstName, String lastName) {
        User user = User.builder()
                .email(email)
                .firstName(firstName)
                .lastName(lastName)
                .provider(AuthProvider.valueOf(provider.toUpperCase()))
                .providerId(providerId)
                .emailVerified(true) // Google emails are pre-verified
                .role(Role.USER)
                .enabled(true)
                .build();
        
        return userRepository.save(user);
    }
    
    private User updateExistingUser(User user, Map<String, Object> attributes) {
        // Update user info if needed
        String firstName = (String) attributes.get("given_name");
        String lastName = (String) attributes.get("family_name");
        
        if (firstName != null && !firstName.equals(user.getFirstName())) {
            user.setFirstName(firstName);
        }
        if (lastName != null && !lastName.equals(user.getLastName())) {
            user.setLastName(lastName);
        }
        
        return userRepository.save(user);
    }
}
