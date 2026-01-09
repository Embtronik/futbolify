package com.teamsservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO con información básica del usuario obtenida del auth-service
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserInfoDto {
    
    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String countryCode;
    private String phoneNumber;
    private String provider; // GOOGLE, LOCAL, etc.
    private Boolean emailVerified;
    
    /**
     * Método de conveniencia para obtener el nombre completo
     */
    public String getFullName() {
        if (firstName == null && lastName == null) {
            return email;
        }
        return (firstName != null ? firstName : "") + " " + (lastName != null ? lastName : "");
    }
}
