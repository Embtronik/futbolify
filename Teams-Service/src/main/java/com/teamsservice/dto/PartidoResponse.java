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
public class PartidoResponse {

    private Long id;
    private String idPartidoExterno;
    private String equipoLocal;
    private String equipoLocalLogo;
    private String equipoVisitante;
    private String equipoVisitanteLogo;
    private String liga;
    private LocalDateTime fechaHoraPartido;
    private LocalDateTime fechaLimitePronostico;
    private Integer golesLocal;
    private Integer golesVisitante;
    private Boolean partidoFinalizado;
    private Boolean puedePronosticar;
    private List<PronosticoResponse> pronosticos;
    private LocalDateTime createdAt;
}
