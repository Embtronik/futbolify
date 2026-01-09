package com.authservice.dto;

import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequest {
    
    private String firstName;
    
    private String lastName;
    
    @Pattern(regexp = "^\\+[1-9]\\d{0,3}$", message = "Country code must start with + and contain 1-4 digits")
    private String countryCode;
    
    @Pattern(regexp = "^[0-9]{6,15}$", message = "Phone number must be between 6 and 15 digits")
    private String phoneNumber;
}
