package com.teamsservice.dto.stats;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StatsWinnerRowResponse {

    private String name;
    private String color;

    private long wins;
}
