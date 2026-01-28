package com.teamsservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PollaResponse {

    private Long id;
    private String nombre;
    private String descripcion;
    private String creadorEmail;
    private LocalDateTime fechaInicio;
    private BigDecimal montoEntrada;
    private Integer totalParticipantes;
    private Integer totalPartidos;
    private List<ParticipanteResponse> participantes;
    private List<PartidoResponse> partidos;
    private List<GrupoSimpleResponse> gruposInvitados;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
        // Email del usuario autenticado que hace la consulta
    private String emailUsuarioAutenticado;
    private String estado;
        // Removed duplicate fields
}
