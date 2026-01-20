package com.teamsservice.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkCreateMatchTeamsRequest {

    @NotEmpty(message = "Debe enviar al menos un equipo")
    @Valid
    private List<TeamMatchTeamCreateRequest> teams;
}
