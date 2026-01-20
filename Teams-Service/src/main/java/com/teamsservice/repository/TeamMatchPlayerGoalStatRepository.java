package com.teamsservice.repository;

import com.teamsservice.entity.TeamMatchPlayerGoalStat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeamMatchPlayerGoalStatRepository extends JpaRepository<TeamMatchPlayerGoalStat, Long> {

    List<TeamMatchPlayerGoalStat> findByMatchId(Long matchId);

    Optional<TeamMatchPlayerGoalStat> findByMatchIdAndUserEmailIgnoreCase(Long matchId, String userEmail);

    void deleteByMatchId(Long matchId);

    interface PlayerAggRow {
        String getUserEmail();

        Long getUserId();

        long getTotalGoals();

        long getTotalOwnGoals();

        long getMatchesFinished();
    }

    @Query("""
            SELECT
                LOWER(s.userEmail) AS userEmail,
                MAX(s.userId) AS userId,
                SUM(s.goals) AS totalGoals,
                SUM(s.ownGoals) AS totalOwnGoals,
                COUNT(DISTINCT s.match.id) AS matchesFinished
            FROM TeamMatchPlayerGoalStat s
            WHERE s.match.team.id = :teamId
              AND s.match.finished = true
            GROUP BY LOWER(s.userEmail)
            """)
    List<PlayerAggRow> aggregateByTeamFinished(@Param("teamId") Long teamId);

        @Query("""
                        SELECT
                                LOWER(s.userEmail) AS userEmail,
                                MAX(s.userId) AS userId,
                                SUM(s.goals) AS totalGoals,
                                SUM(s.ownGoals) AS totalOwnGoals,
                                COUNT(DISTINCT s.match.id) AS matchesFinished
                        FROM TeamMatchPlayerGoalStat s
                        WHERE s.match.team.id = :teamId
                            AND s.match.finished = true
                            AND year(s.match.matchDateTime) = :year
                            AND (:month IS NULL OR month(s.match.matchDateTime) = :month)
                        GROUP BY LOWER(s.userEmail)
                        """)
        List<PlayerAggRow> aggregateByTeamFinishedInPeriod(@Param("teamId") Long teamId,
                                                                                                             @Param("year") int year,
                                                                                                             @Param("month") Integer month);
}
