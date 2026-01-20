package com.teamsservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlayerHistoricalStatsResponse {

    private String userEmail;
    private Long userId;

    private int totalGoals;
    private int totalOwnGoals;
    private int matchesFinished;

    private UserInfoDto userInfo;
}
