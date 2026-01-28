package com.teamsservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParticipanteResponse {

    private Long id;
    private String emailUsuario;
    private LocalDateTime fechaInvitacion;
    private LocalDateTime fechaRespuesta;
        private UserInfoDto userInfo; // Información enriquecida del usuario
}
