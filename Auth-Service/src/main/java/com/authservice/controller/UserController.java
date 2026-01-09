package com.authservice.controller;

import com.authservice.dto.UpdateProfileRequest;
import com.authservice.dto.UserDTO;
import com.authservice.exception.ResourceNotFoundException;
import com.authservice.model.User;
import com.authservice.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/user")
@RequiredArgsConstructor
public class UserController {
    
    private final UserRepository userRepository;
    
    @GetMapping("/me")
    public ResponseEntity<UserDTO> getCurrentUser(@AuthenticationPrincipal User currentUser) {
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        UserDTO userDTO = UserDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .countryCode(user.getCountryCode())
                .phoneNumber(user.getPhoneNumber())
                .provider(user.getProvider())
                .emailVerified(user.isEmailVerified())
                .build();
        
        return ResponseEntity.ok(userDTO);
    }
    
    @PutMapping("/me")
    public ResponseEntity<UserDTO> updateProfile(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody UpdateProfileRequest request) {
        
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        // Users registered via Google OAuth can only update phone fields
        boolean isOAuthUser = user.getProvider() != com.authservice.model.AuthProvider.LOCAL;
        
        // Update fields if provided
        if (!isOAuthUser && request.getFirstName() != null) {
            user.setFirstName(request.getFirstName());
        }
        if (!isOAuthUser && request.getLastName() != null) {
            user.setLastName(request.getLastName());
        }
        if (request.getCountryCode() != null) {
            user.setCountryCode(request.getCountryCode());
        }
        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber());
        }
        
        User updatedUser = userRepository.save(user);
        
        UserDTO userDTO = UserDTO.builder()
                .id(updatedUser.getId())
                .email(updatedUser.getEmail())
                .firstName(updatedUser.getFirstName())
                .lastName(updatedUser.getLastName())
                .countryCode(updatedUser.getCountryCode())
                .phoneNumber(updatedUser.getPhoneNumber())
                .provider(updatedUser.getProvider())
                .emailVerified(updatedUser.isEmailVerified())
                .build();
        
        return ResponseEntity.ok(userDTO);
    }
    
    @GetMapping("/by-email")
    public ResponseEntity<UserDTO> getUserByEmail(@RequestParam String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        
        UserDTO userDTO = UserDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .countryCode(user.getCountryCode())
                .phoneNumber(user.getPhoneNumber())
                .provider(user.getProvider())
                .emailVerified(user.isEmailVerified())
                .build();
        
        return ResponseEntity.ok(userDTO);
    }
}
