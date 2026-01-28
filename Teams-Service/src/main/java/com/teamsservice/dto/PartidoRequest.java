package com.teamsservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PartidoRequest {

    @NotBlank(message = "El ID del partido externo es requerido")
    private String idPartidoExterno;

    @NotBlank(message = "El equipo local es requerido")
    private String equipoLocal;

    @NotBlank(message = "El logo del equipo local es requerido")
    private String equipoLocalLogo;

    @NotBlank(message = "El equipo visitante es requerido")
    private String equipoVisitante;

    @NotBlank(message = "El logo del equipo visitante es requerido")
    private String equipoVisitanteLogo;

    @NotBlank(message = "La liga es requerida")
    private String liga;

    /**
     * Fecha y hora del partido en formato ISO 8601 UTC.
     * 
     * Formatos aceptados:
     * - "2024-01-28T19:30:00Z" (recomendado - con Z para indicar UTC)
     * - "2024-01-28T19:30:00" (sin Z, se asume UTC)
     * 
     * IMPORTANTE: La fecha se guarda en UTC en la BD.
     * El frontend debe enviar la fecha en UTC o con 'Z' al final.
     */
    @NotNull(message = "La fecha del partido es requerida")
    private LocalDateTime fechaHoraPartido;
}
