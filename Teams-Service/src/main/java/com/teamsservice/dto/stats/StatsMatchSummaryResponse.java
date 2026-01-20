package com.teamsservice.dto.stats;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StatsMatchSummaryResponse {

    private Long matchId;
    private LocalDateTime matchDateTime;
    private String matchAddress;

    private StatsMatchTeamScoreResponse teamA;
    private StatsMatchTeamScoreResponse teamB;

    /**
     * matchTeamId ganador; null si empate o si no se puede calcular.
     */
    private Long winnerMatchTeamId;
}
