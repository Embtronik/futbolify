package com.teamsservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamMatchTeamCreateRequest {

    @NotBlank(message = "El nombre del equipo es requerido")
    private String name;

    @NotBlank(message = "El color del equipo es requerido")
    private String color;
}
