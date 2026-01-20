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
public class AdminSetAttendanceRequest {

    /** ATTENDING, NOT_ATTENDING, PENDING */
    @NotBlank(message = "El estado de asistencia es requerido")
    private String status;
}
