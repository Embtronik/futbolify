package com.teamsservice.repository;

import com.teamsservice.entity.TeamMatch;
import com.teamsservice.entity.TeamMatchAttendance;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeamMatchAttendanceRepository extends JpaRepository<TeamMatchAttendance, Long> {

    Optional<TeamMatchAttendance> findByMatchIdAndUserId(Long matchId, Long userId);

    @Query("""
            SELECT DISTINCT a.match
            FROM TeamMatchAttendance a
            JOIN FETCH a.match.team t
            WHERE lower(a.userEmail) = lower(:userEmail)
            ORDER BY a.match.matchDateTime DESC
            """)
    List<TeamMatch> findMatchesByUserEmail(@Param("userEmail") String userEmail);
}
