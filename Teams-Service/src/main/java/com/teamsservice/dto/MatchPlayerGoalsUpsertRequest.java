package com.teamsservice.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchPlayerGoalsUpsertRequest {

    /**
     * We use email as primary identifier for stats to avoid issues when userId can be 0.
     */
    @NotBlank(message = "El email del jugador es requerido")
    private String userEmail;

    private Long userId;

    @Min(value = 0, message = "Los goles no pueden ser negativos")
    private int goals;

    @Min(value = 0, message = "Los autogoles no pueden ser negativos")
    private int ownGoals;
}
