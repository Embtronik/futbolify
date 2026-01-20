package com.teamsservice.dto.stats;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StatsMatchesPageResponse {

    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean last;

    private List<StatsMatchSummaryResponse> content;
}
