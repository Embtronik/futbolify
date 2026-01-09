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

    @NotNull(message = "La fecha del partido es requerida")
    private LocalDateTime fechaHoraPartido;
}
