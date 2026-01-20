package com.teamsservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchPlayerStatResponse {

    private Long userId;
    private String userEmail;

    private int goals;
    private int ownGoals;

    private String position;
    private UserInfoDto userInfo;
}
