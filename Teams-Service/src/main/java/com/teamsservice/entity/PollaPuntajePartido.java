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
@Table(
        name = "polla_puntajes_partido",
        uniqueConstraints = @UniqueConstraint(columnNames = {"polla_partido_id", "email_participante"}),
        indexes = {
                @Index(name = "idx_puntaje_partido_polla_partido_id", columnList = "polla_partido_id"),
                @Index(name = "idx_puntaje_partido_email", columnList = "email_participante")
        }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PollaPuntajePartido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "polla_partido_id", nullable = false)
    private PollaPartido pollaPartido;

    @Column(name = "email_participante", nullable = false, length = 255)
    private String emailParticipante;

    @Column(name = "puntos", nullable = false)
    private Integer puntos;

    @Column(name = "definitivo", nullable = false)
    private Boolean definitivo;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
