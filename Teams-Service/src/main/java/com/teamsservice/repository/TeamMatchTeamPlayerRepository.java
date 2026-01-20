package com.teamsservice.repository;

import com.teamsservice.entity.TeamMatchTeamPlayer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeamMatchTeamPlayerRepository extends JpaRepository<TeamMatchTeamPlayer, Long> {

    List<TeamMatchTeamPlayer> findByMatchTeamIdOrderByIdAsc(Long matchTeamId);

    Optional<TeamMatchTeamPlayer> findByMatchTeamIdAndUserId(Long matchTeamId, Long userId);

    Optional<TeamMatchTeamPlayer> findByMatchTeamMatchIdAndUserId(Long matchId, Long userId);

    Optional<TeamMatchTeamPlayer> findByMatchTeamMatchIdAndUserEmailIgnoreCase(Long matchId, String userEmail);

    List<TeamMatchTeamPlayer> findByMatchTeamMatchId(Long matchId);

    void deleteByMatchTeamMatchIdAndUserId(Long matchId, Long userId);
}
