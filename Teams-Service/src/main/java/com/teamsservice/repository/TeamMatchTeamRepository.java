package com.teamsservice.repository;

import com.teamsservice.entity.TeamMatchTeam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamMatchTeamRepository extends JpaRepository<TeamMatchTeam, Long> {

    List<TeamMatchTeam> findByMatchIdOrderByIdAsc(Long matchId);
}
