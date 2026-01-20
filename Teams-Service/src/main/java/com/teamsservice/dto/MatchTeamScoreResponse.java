package com.teamsservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchTeamScoreResponse {

    private Long matchTeamId;
    private String name;
    private String color;

    private int goals;

    private List<MatchPlayerStatResponse> players;
}
