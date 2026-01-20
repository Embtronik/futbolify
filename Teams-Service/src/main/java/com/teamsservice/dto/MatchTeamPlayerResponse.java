package com.teamsservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchTeamPlayerResponse {

    private Long userId;
    private String userEmail;
    private String position;
    private UserInfoDto userInfo;
}
