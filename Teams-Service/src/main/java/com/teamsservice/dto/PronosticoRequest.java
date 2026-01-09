package com.teamsservice.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PronosticoRequest {

    @NotNull(message = "El ID del partido es requerido")
    private Long pollaPartidoId;

    @NotNull(message = "Los goles del equipo local son requeridos")
    @Min(value = 0, message = "Los goles no pueden ser negativos")
    private Integer golesLocalPronosticado;

    @NotNull(message = "Los goles del equipo visitante son requeridos")
    @Min(value = 0, message = "Los goles no pueden ser negativos")
    private Integer golesVisitantePronosticado;
}
