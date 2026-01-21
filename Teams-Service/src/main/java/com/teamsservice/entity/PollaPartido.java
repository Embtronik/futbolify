package com.teamsservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "polla_partidos", 
    uniqueConstraints = @UniqueConstraint(columnNames = {"polla_id", "id_partido_externo"}),
    indexes = {
        @Index(name = "idx_polla_partido_polla_id", columnList = "polla_id"),
        @Index(name = "idx_fecha_hora_partido", columnList = "fecha_hora_partido"),
        @Index(name = "idx_id_partido_externo", columnList = "id_partido_externo")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PollaPartido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "polla_id", nullable = false)
    private Polla polla;

    @Column(name = "id_partido_externo", nullable = false, length = 100)
    private String idPartidoExterno;

    @Column(name = "equipo_local", nullable = false, length = 100)
    private String equipoLocal;

    @Column(name = "equipo_local_logo", nullable = false, length = 500)
    private String equipoLocalLogo;

    @Column(name = "equipo_visitante", nullable = false, length = 100)
    private String equipoVisitante;

    @Column(name = "equipo_visitante_logo", nullable = false, length = 500)
    private String equipoVisitanteLogo;

    @Column(name = "liga", nullable = false, length = 100)
    private String liga;

    @Column(name = "fecha_hora_partido", nullable = false)
    private LocalDateTime fechaHoraPartido;

    @Column(name = "fecha_limite_pronostico", nullable = false)
    private LocalDateTime fechaLimitePronostico;

    @Column(name = "goles_local")
    private Integer golesLocal;

    @Column(name = "goles_visitante")
    private Integer golesVisitante;

    // ==========================
    // API-Football sync/cache
    // ==========================
    @Column(name = "api_status_short", length = 20)
    private String apiStatusShort;

    @Column(name = "api_status_long", length = 100)
    private String apiStatusLong;

    @Column(name = "last_api_sync_at")
    private LocalDateTime lastApiSyncAt;

    @Column(name = "partido_finalizado")
    @Builder.Default
    private Boolean partidoFinalizado = false;

    @OneToMany(mappedBy = "pollaPartido", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PollaPronostico> pronosticos = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * Calcula la fecha límite de pronóstico (5 minutos antes del partido)
     */
    @PrePersist
    @PreUpdate
    public void calcularFechaLimite() {
        if (fechaHoraPartido != null) {
            this.fechaLimitePronostico = fechaHoraPartido.minusMinutes(5);
        }
    }

    /**
     * Verifica si aún se pueden registrar pronósticos
     */
    public boolean puedePronosticar() {
        return LocalDateTime.now().isBefore(fechaLimitePronostico) && !partidoFinalizado;
    }
}
