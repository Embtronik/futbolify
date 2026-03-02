package com.teamsservice.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PartidoResultadoDetalladoResponse {

    private String equipoLocal;
    private String equipoVisitante;
    private String equipoLocalLogo;
    private String equipoVisitanteLogo;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime fechaHoraPartido;

    private Integer golesLocalReal;
    private Integer golesVisitanteReal;
    private Integer golesLocalPronosticado;
    private Integer golesVisitantePronosticado;
    private Integer puntosObtenidos;
}
