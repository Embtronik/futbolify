package com.teamsservice.dto;

import jakarta.validation.constraints.Future;
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
public class TeamMatchCreateRequest {
    @NotNull(message = "La dirección del partido es requerida")
    private String address;

    private Double latitude;

    private Double longitude;

    private String placeId;

    @NotNull(message = "La fecha y hora del partido es requerida")
    @Future(message = "La fecha del partido debe ser futura")
    private LocalDateTime matchDateTime;
}
