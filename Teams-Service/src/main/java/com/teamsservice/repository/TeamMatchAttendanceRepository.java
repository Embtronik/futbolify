package com.teamsservice.repository;

import com.teamsservice.entity.TeamMatchAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TeamMatchAttendanceRepository extends JpaRepository<TeamMatchAttendance, Long> {

    Optional<TeamMatchAttendance> findByMatchIdAndUserId(Long matchId, Long userId);
}
