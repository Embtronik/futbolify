package com.teamsservice.repository;

import com.teamsservice.entity.TeamMatch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamMatchRepository extends JpaRepository<TeamMatch, Long> {

    List<TeamMatch> findByTeamIdOrderByMatchDateTimeAsc(Long teamId);

    Page<TeamMatch> findByTeamId(Long teamId, Pageable pageable);

    @Query("SELECT m FROM TeamMatch m WHERE m.team.id IN :teamIds")
    List<TeamMatch> findByTeamIds(@Param("teamIds") List<Long> teamIds);

        @Query("""
                        SELECT DISTINCT year(m.matchDateTime)
                        FROM TeamMatch m
                        WHERE m.team.id = :teamId
                            AND m.finished = true
                        ORDER BY year(m.matchDateTime) DESC
                        """)
        List<Integer> findFinishedYears(@Param("teamId") Long teamId);

        @Query("""
                        SELECT DISTINCT month(m.matchDateTime)
                        FROM TeamMatch m
                        WHERE m.team.id = :teamId
                            AND m.finished = true
                            AND year(m.matchDateTime) = :year
                        ORDER BY month(m.matchDateTime) ASC
                        """)
        List<Integer> findFinishedMonths(@Param("teamId") Long teamId, @Param("year") int year);

        @Query("""
                        SELECT m
                        FROM TeamMatch m
                        WHERE m.team.id = :teamId
                            AND m.finished = true
                            AND year(m.matchDateTime) = :year
                            AND (:month IS NULL OR month(m.matchDateTime) = :month)
                        """)
        Page<TeamMatch> findFinishedMatches(@Param("teamId") Long teamId,
                                                                                @Param("year") int year,
                                                                                @Param("month") Integer month,
                                                                                Pageable pageable);

        @Query("""
                        SELECT m
                        FROM TeamMatch m
                        WHERE m.team.id = :teamId
                            AND m.finished = true
                            AND year(m.matchDateTime) = :year
                            AND (:month IS NULL OR month(m.matchDateTime) = :month)
                        """)
        List<TeamMatch> findFinishedMatches(@Param("teamId") Long teamId,
                                                                                @Param("year") int year,
                                                                                @Param("month") Integer month);
}
