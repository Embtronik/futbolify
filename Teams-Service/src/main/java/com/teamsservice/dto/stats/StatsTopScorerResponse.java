package com.teamsservice.dto.stats;

import com.teamsservice.dto.UserInfoDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StatsTopScorerResponse {

    private String userEmail;
    private Long userId;

    private int goals;
    private int ownGoals;

    private UserInfoDto userInfo;
}
