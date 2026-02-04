package com.authservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String accessToken;
    private String refreshToken;
    @Builder.Default
    private String tokenType = "Bearer";
    private Long expiresIn;
    private UserInfo user;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInfo {
        private Long id;
        private String email;
        private String firstName;
        private String lastName;
        private boolean emailVerified;
        private String provider;

        /**
         * True if the user has accepted the currently active terms version.
         */
        private boolean termsAccepted;

        /**
         * The currently active terms version required by the system.
         */
        private String requiredTermsVersion;

        /**
         * The latest accepted terms version (may differ from requiredTermsVersion).
         */
        private String acceptedTermsVersion;
    }
}
