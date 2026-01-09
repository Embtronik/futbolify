package com.teamsservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PronosticoResponse {

    private Long id;
    private String emailParticipante;
    private Integer golesLocalPronosticado;
    private Integer golesVisitantePronosticado;
    private LocalDateTime fechaRegistro;
    private LocalDateTime fechaActualizacion;
    private Integer puntosObtenidos;
    private UserInfoDto userInfo; // Información enriquecida del participante
}
