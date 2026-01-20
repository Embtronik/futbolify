package com.teamsservice.dto.stats;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StatsTeamAccessResponse {

    private Long teamId;
    private String teamName;

    /**
     * OWNER | MEMBER
     */
    private String role;
}
