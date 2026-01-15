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
public class TeamMatchAttendanceResponse {

    private Long userId;
    private String userEmail;
    /** ATTENDING, NOT_ATTENDING o PENDING si no ha respondido */
    private String status;
    private LocalDateTime respondedAt;
    private UserInfoDto userInfo;
}
