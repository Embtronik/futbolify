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
public class ParticipanteResultadoResponse {

    private String nombreParticipante;
    private String emailParticipante;
    private Integer puntajeTotal;
    private List<PartidoResultadoDetalladoResponse> partidos;
}
