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
@Table(name = "team_match_team_players", indexes = {
        @Index(name = "idx_match_team_player_team_id", columnList = "match_team_id"),
        @Index(name = "idx_match_team_player_user_id", columnList = "user_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_match_team_player_team_user", columnNames = {"match_team_id", "user_id"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamMatchTeamPlayer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_team_id", nullable = false)
    private TeamMatchTeam matchTeam;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "user_email", nullable = false)
    private String userEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "position", nullable = false, length = 20)
    private PlayerPosition position;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum PlayerPosition {
        GOALKEEPER,
        DEFENDER,
        MIDFIELDER,
        FORWARD
    }
}
