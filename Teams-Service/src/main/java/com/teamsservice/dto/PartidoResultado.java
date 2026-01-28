package com.teamsservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Resultado de un partido con el pronóstico del participante y puntos obtenidos.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PartidoResultado {

    private Long partidoId;
    private String idPartidoExterno;
    
    // Info del partido
    private String equipoLocal;
    private String equipoLocalLogo;
    private String equipoVisitante;
    private String equipoVisitanteLogo;
    private String liga;
    private LocalDateTime fechaHoraPartido;
    
    // Marcador real (resultado final)
    private Integer golesLocalReal;
    private Integer golesVisitanteReal;
    
    // Pronóstico del participante
    private Integer golesLocalPronosticado;
    private Integer golesVisitantePronosticado;
    
    // Puntos obtenidos en este partido
    private Integer puntosObtenidos;
}
