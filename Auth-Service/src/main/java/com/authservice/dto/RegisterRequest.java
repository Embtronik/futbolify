package com.authservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {
    
    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    private String email;
    
    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;
    
    @NotBlank(message = "First name is required")
    private String firstName;
    
    @NotBlank(message = "Last name is required")
    private String lastName;
    
    @Pattern(regexp = "^\\+[1-9]\\d{0,3}$", message = "Country code must start with + and contain 1-4 digits")
    private String countryCode;
    
    @Pattern(regexp = "^[0-9]{6,15}$", message = "Phone number must be between 6 and 15 digits")
    private String phoneNumber;

    @AssertTrue(message = "Debe aceptar los términos y condiciones")
    private boolean acceptTerms;

    @AssertTrue(message = "Debe aceptar el tratamiento de datos")
    private boolean dataProcessingAccepted;

    /**
     * Optional. If null/blank, active terms version will be used.
     */
    private String termsVersion;
}
