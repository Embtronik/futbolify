package com.teamsservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamMemberResponse {

    private Long id;
    private Long teamId;
    private String teamName;
    private Long userId;
    private String userEmail;
    private String status; // PENDING, APPROVED, REJECTED
    private LocalDateTime requestedAt;
    private LocalDateTime approvedAt;
    private Long approvedBy;
    
    // Información enriquecida del usuario (del auth-service)
    private UserInfoDto userInfo;
}
