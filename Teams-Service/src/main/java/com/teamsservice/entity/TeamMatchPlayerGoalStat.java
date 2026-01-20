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
@Table(name = "team_match_player_goal_stats", indexes = {
        @Index(name = "idx_match_player_goal_match_id", columnList = "match_id"),
        @Index(name = "idx_match_player_goal_user_id", columnList = "user_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_match_player_goal_match_email", columnNames = {"match_id", "user_email"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamMatchPlayerGoalStat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_id", nullable = false)
    private TeamMatch match;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "user_email", nullable = false, length = 255)
    private String userEmail;

    @Column(name = "goals", nullable = false)
    @Builder.Default
    private int goals = 0;

    @Column(name = "own_goals", nullable = false)
    @Builder.Default
    private int ownGoals = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
