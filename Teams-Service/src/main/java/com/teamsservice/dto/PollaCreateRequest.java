package com.teamsservice.dto;

import com.teamsservice.entity.Polla;
import jakarta.validation.constraints.*;
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
public class PollaCreateRequest {

    @NotBlank(message = "El nombre de la polla es requerido")
    @Size(min = 3, max = 100, message = "El nombre debe tener entre 3 y 100 caracteres")
    private String nombre;

    @Size(max = 500, message = "La descripción no puede exceder 500 caracteres")
    private String descripcion;

    @NotNull(message = "La fecha de inicio es requerida")
    @Future(message = "La fecha de inicio debe ser futura")
    private LocalDateTime fechaInicio;

    @NotNull(message = "El monto de entrada es requerido")
    @DecimalMin(value = "0.0", inclusive = false, message = "El monto debe ser mayor a 0")
    @Digits(integer = 8, fraction = 2, message = "Formato de monto inválido")
    private BigDecimal montoEntrada;

    @NotNull(message = "El tipo de polla es requerido")
    private Polla.PollaTipo tipo;

    // Para pollas privadas: grupos invitados (requerido)
    // Para pollas públicas: opcional, si se especifican son grupos adicionales con acceso sin pago
    private List<Long> gruposIds;

    // OPCIONAL: Lista de emails para invitaciones individuales (casos especiales)
    // Los miembros de los grupos seleccionados pueden participar automáticamente sin estar en esta lista
    private List<String> emailsInvitados;
}
