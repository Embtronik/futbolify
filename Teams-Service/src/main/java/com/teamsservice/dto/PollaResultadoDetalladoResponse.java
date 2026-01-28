package com.teamsservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Respuesta con resultados detallados de una polla finalizada.
 * Incluye el detalle de cada participante con sus pronósticos y puntos por partido.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PollaResultadoDetalladoResponse {

    private Long pollaId;
    private String nombrePolla;
    private String estadoPolla;
    private Boolean finalizada;
    
    /** Lista de participantes con sus resultados detallados */
    private List<ParticipanteResultadoDetallado> participantes;
}
