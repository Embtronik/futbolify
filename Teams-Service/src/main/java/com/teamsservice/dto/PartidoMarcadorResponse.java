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
public class PartidoMarcadorResponse {

    private Long pollaId;
    private Long pollaPartidoId;
    private String idPartidoExterno;

    private String apiStatusShort;
    private String apiStatusLong;

    private Integer golesLocal;
    private Integer golesVisitante;
    private Boolean partidoFinalizado;

    private LocalDateTime lastApiSyncAt;

    /** "DB" o "API" (quién determinó la respuesta en esta llamada) */
    private String servedFrom;

    /** segundos aplicados como TTL para este estado; null si infinito */
    private Long ttlSeconds;
}
