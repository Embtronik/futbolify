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
@Table(name = "team_match_teams", indexes = {
        @Index(name = "idx_match_team_match_id", columnList = "match_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamMatchTeam {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_id", nullable = false)
    private TeamMatch match;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    /**
     * Color identifier used by the frontend (e.g. "#FF0000", "blue", etc.)
     */
    @Column(name = "color", nullable = false, length = 30)
    private String color;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
