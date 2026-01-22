package com.teamsservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PollaRankingItemResponse {

    /** Nombre a mostrar en el ranking (ideal para UI). */
    private String nombreParticipante;

    private String emailParticipante;
    private Integer puntos;
    private UserInfoDto userInfo;
}
