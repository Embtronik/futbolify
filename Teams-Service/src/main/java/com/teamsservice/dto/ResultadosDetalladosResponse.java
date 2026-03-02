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
public class ResultadosDetalladosResponse {

    private Long pollaId;
    private String nombrePolla;
    private List<ParticipanteResultadoResponse> participantes;
}
