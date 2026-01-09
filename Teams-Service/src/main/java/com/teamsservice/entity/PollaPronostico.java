package com.teamsservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "polla_pronosticos", 
    uniqueConstraints = @UniqueConstraint(columnNames = {"polla_partido_id", "email_participante"}),
    indexes = {
        @Index(name = "idx_polla_partido_id", columnList = "polla_partido_id"),
        @Index(name = "idx_email_participante", columnList = "email_participante")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PollaPronostico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "polla_partido_id", nullable = false)
    private PollaPartido pollaPartido;

    @Column(name = "email_participante", nullable = false, length = 255)
    private String emailParticipante;

    @Column(name = "goles_local_pronosticado", nullable = false)
    private Integer golesLocalPronosticado;

    @Column(name = "goles_visitante_pronosticado", nullable = false)
    private Integer golesVisitante;

    @CreationTimestamp
    @Column(name = "fecha_registro", nullable = false, updatable = false)
    private LocalDateTime fechaRegistro;

    @UpdateTimestamp
    @Column(name = "fecha_actualizacion")
    private LocalDateTime fechaActualizacion;

    @Column(name = "puntos_obtenidos")
    private Integer puntosObtenidos;

    /**
     * Calcula puntos obtenidos comparando pronóstico con resultado real
     * Lógica: 
     * - Marcador exacto: 5 puntos
     * - Resultado correcto (ganador/empate): 3 puntos
     * - Diferencia de goles correcta: 2 puntos
     * - 0 puntos si no acertó nada
     */
    public void calcularPuntos(Integer golesLocalReal, Integer golesVisitanteReal) {
        if (golesLocalReal == null || golesVisitanteReal == null) {
            this.puntosObtenidos = 0;
            return;
        }

        // Marcador exacto
        if (golesLocalPronosticado.equals(golesLocalReal) && 
            golesVisitante.equals(golesVisitanteReal)) {
            this.puntosObtenidos = 5;
            return;
        }

        int diferenciaReal = golesLocalReal - golesVisitanteReal;
        int diferenciaPronostico = golesLocalPronosticado - golesVisitante;

        // Resultado correcto (ganador o empate)
        if ((diferenciaReal > 0 && diferenciaPronostico > 0) ||
            (diferenciaReal < 0 && diferenciaPronostico < 0) ||
            (diferenciaReal == 0 && diferenciaPronostico == 0)) {
            
            // Diferencia de goles correcta además del resultado
            if (diferenciaReal == diferenciaPronostico) {
                this.puntosObtenidos = 3;
            } else {
                this.puntosObtenidos = 2;
            }
            return;
        }

        this.puntosObtenidos = 0;
    }
}
