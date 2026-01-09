package com.teamsservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JoinTeamRequest {

    @NotBlank(message = "Join code is required")
    @Size(min = 6, max = 6, message = "Join code must be exactly 6 characters")
    private String joinCode;
}
