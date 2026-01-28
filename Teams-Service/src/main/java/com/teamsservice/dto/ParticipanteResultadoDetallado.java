package com.teamsservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Resultado detallado de un participante en una polla.
 * Incluye todos sus pronósticos, marcadores reales y puntos por partido.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParticipanteResultadoDetallado {

    private String emailParticipante;
    private String nombreParticipante;
    private UserInfoDto userInfo;
    
    /** Puntaje total acumulado en todos los partidos */
    private Integer puntajeTotal;
    
    /** Detalle de cada partido con pronóstico y puntos */
    private List<PartidoResultado> partidos;
}
