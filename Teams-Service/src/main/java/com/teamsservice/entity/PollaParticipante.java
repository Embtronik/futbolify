package com.teamsservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "polla_participantes", 
    uniqueConstraints = @UniqueConstraint(columnNames = {"polla_id", "email_usuario"}),
    indexes = {
        @Index(name = "idx_polla_id", columnList = "polla_id"),
        @Index(name = "idx_email_usuario", columnList = "email_usuario")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PollaParticipante {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "polla_id", nullable = false)
    private Polla polla;

    @Column(name = "email_usuario", nullable = false, length = 255)
    private String emailUsuario;

}
