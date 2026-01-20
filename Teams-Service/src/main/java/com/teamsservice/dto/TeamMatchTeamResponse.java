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
public class TeamMatchTeamResponse {

    private Long id;
    private Long matchId;
    private String name;
    private String color;
    private LocalDateTime createdAt;

    private List<MatchTeamPlayerResponse> players;
}
