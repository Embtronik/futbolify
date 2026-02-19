package com.teamsservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "pollas", indexes = {
    @Index(name = "idx_creador_email", columnList = "creador_email"),
    @Index(name = "idx_estado", columnList = "estado"),
    @Index(name = "idx_fecha_inicio", columnList = "fecha_inicio")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Polla {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(length = 500)
    private String descripcion;

    @Column(name = "creador_email", nullable = false, length = 255)
    private String creadorEmail;

    @Column(name = "fecha_inicio", nullable = false)
    private LocalDateTime fechaInicio;

    @Column(name = "monto_entrada", nullable = false, precision = 10, scale = 2)
    private BigDecimal montoEntrada;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private PollaEstado estado = PollaEstado.CREADA;

    @OneToMany(mappedBy = "polla", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PollaParticipante> participantes = new ArrayList<>();

    @OneToMany(mappedBy = "polla", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PollaPartido> partidos = new ArrayList<>();

    @ManyToMany
    @JoinTable(
        name = "polla_grupos",
        joinColumns = @JoinColumn(name = "polla_id"),
        inverseJoinColumns = @JoinColumn(name = "team_id")
    )
    @Builder.Default
    private List<Team> gruposInvitados = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    public enum PollaEstado {
        CREADA,      // Recién creada, aún no visible
        ABIERTA,     // Visible y aceptando participantes
        CERRADA,     // Ya no acepta nuevos participantes
        FINALIZADA   // Todos los partidos finalizados
    }
}
