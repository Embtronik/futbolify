package com.teamsservice.repository;

import com.teamsservice.entity.TeamMatch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamMatchRepository extends JpaRepository<TeamMatch, Long> {

    List<TeamMatch> findByTeamIdOrderByMatchDateTimeAsc(Long teamId);

    Page<TeamMatch> findByTeamId(Long teamId, Pageable pageable);
}
