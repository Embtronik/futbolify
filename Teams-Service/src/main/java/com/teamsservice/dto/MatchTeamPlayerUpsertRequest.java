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
public class MatchTeamPlayerUpsertRequest {

    /** GOALKEEPER, DEFENDER, MIDFIELDER, FORWARD */
    @NotBlank(message = "La posición es requerida")
    private String position;
}
