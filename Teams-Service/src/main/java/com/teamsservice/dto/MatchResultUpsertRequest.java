package com.teamsservice.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchResultUpsertRequest {

    /**
     * If true, marks the match as finished.
     */
    @NotNull(message = "El campo finished es requerido")
    private Boolean finished;

    /**
     * List of players with their goals and own-goals.
     * You can send only players with (goals>0 || ownGoals>0).
     */
    @Valid
    private List<MatchPlayerGoalsUpsertRequest> players;
}
