package com.teamsservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchResultResponse {

    private Long teamId;
    private Long matchId;

    private boolean finished;
    private LocalDateTime finishedAt;
    private LocalDateTime resultUpdatedAt;

    private String matchAddress;
    private LocalDateTime matchDateTime;

    /**
     * Exactly 2 teams expected for result calculation.
     */
    private List<MatchTeamScoreResponse> teams;
}
