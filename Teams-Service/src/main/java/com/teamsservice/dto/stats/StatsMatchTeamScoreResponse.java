package com.teamsservice.dto.stats;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StatsMatchTeamScoreResponse {

    private Long matchTeamId;
    private String name;
    private String color;
    private int goals;
}
