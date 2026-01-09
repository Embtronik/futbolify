package com.authservice.dto;

import com.authservice.model.AuthProvider;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {
    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String countryCode;
    private String phoneNumber;
    private AuthProvider provider;
    private boolean emailVerified;
}
