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
public class PollaRankingResponse {

    private Long pollaId;
    private String estadoPolla;
    private Boolean definitivo; // true si la polla está FINALIZADA

    private List<PollaRankingItemResponse> ranking;
}
