package com.teamsservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.ColumnDefault;

import java.time.LocalDateTime;

@Entity
@Table(name = "team_matches", indexes = {
        @Index(name = "idx_team_match_team_id", columnList = "team_id"),
        @Index(name = "idx_team_match_datetime", columnList = "match_datetime")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamMatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @Column(length = 500)
    private String address;

    @Column
    private Double latitude;

    @Column
    private Double longitude;

    @Column(name = "place_id", length = 255)
    private String placeId;

    @Column(name = "match_datetime", nullable = false)
    private LocalDateTime matchDateTime;

    @Column(name = "finished", nullable = false, columnDefinition = "boolean default false")
    @ColumnDefault("false")
    @Builder.Default
    private boolean finished = false;

    @Column(name = "finished_at")
    private LocalDateTime finishedAt;

    @Column(name = "result_updated_at")
    private LocalDateTime resultUpdatedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
