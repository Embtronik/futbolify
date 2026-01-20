package com.teamsservice.controller;

import com.teamsservice.dto.AdminSetAttendanceRequest;
import com.teamsservice.dto.BulkCreateMatchTeamsRequest;
import com.teamsservice.dto.MatchAttendanceSummaryResponse;
import com.teamsservice.dto.MatchResultResponse;
import com.teamsservice.dto.MatchResultNotificationResponse;
import com.teamsservice.dto.MatchResultUpsertRequest;
import com.teamsservice.dto.MatchTeamsNotificationResponse;
import com.teamsservice.dto.MatchTeamPlayerUpsertRequest;
import com.teamsservice.dto.PageResponse;
import com.teamsservice.dto.PlayerHistoricalStatsResponse;
import com.teamsservice.dto.TeamMatchCreateRequest;
import com.teamsservice.dto.TeamMatchAttendanceResponse;
import com.teamsservice.dto.TeamMatchResponse;
import com.teamsservice.dto.TeamMatchTeamCreateRequest;
import com.teamsservice.dto.TeamMatchTeamResponse;
import com.teamsservice.security.UserPrincipal;
import com.teamsservice.service.TeamMatchLineupNotificationService;
import com.teamsservice.service.TeamMatchResultNotificationService;
import com.teamsservice.service.TeamMatchResultService;
import com.teamsservice.service.TeamMatchService;
import com.teamsservice.service.TeamMatchTeamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teams/{teamId}/matches")
@RequiredArgsConstructor
@Slf4j
public class TeamMatchController {

    private final TeamMatchService teamMatchService;
        private final TeamMatchTeamService teamMatchTeamService;
        private final TeamMatchLineupNotificationService teamMatchLineupNotificationService;
                private final TeamMatchResultService teamMatchResultService;
                                private final TeamMatchResultNotificationService teamMatchResultNotificationService;

    @PostMapping
    public ResponseEntity<TeamMatchResponse> createTeamMatch(
            @PathVariable Long teamId,
            @Valid @RequestBody TeamMatchCreateRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        log.info("Creating team match for team {} by user {}", teamId, userPrincipal.getUserId());

        TeamMatchResponse response = teamMatchService.createTeamMatch(
                teamId,
                request,
                userPrincipal.getUserId(),
                userPrincipal.getEmail());

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

        @GetMapping
        public ResponseEntity<PageResponse<TeamMatchResponse>> getTeamMatches(
            @PathVariable Long teamId,
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size) {

        log.info("Getting team matches for team {} by user {} page={} size={}",
                teamId, userPrincipal.getUserId(), page, size);

                PageResponse<TeamMatchResponse> response = teamMatchService.getTeamMatches(
                teamId,
                userPrincipal.getUserId(),
                userPrincipal.getEmail(),
                page,
                size);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{matchId}/attendance")
    public ResponseEntity<Void> confirmAttendance(
            @PathVariable Long teamId,
            @PathVariable Long matchId,
            @RequestParam("attending") boolean attending,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        log.info("User {} confirming attendance={} for match {} in team {}",
                userPrincipal.getUserId(), attending, matchId, teamId);

        teamMatchService.confirmAttendance(
                teamId,
                matchId,
                userPrincipal.getUserId(),
                userPrincipal.getEmail(),
                attending);

        return ResponseEntity.ok().build();
    }

    @GetMapping("/{matchId}/attendance")
    public ResponseEntity<List<TeamMatchAttendanceResponse>> getMatchAttendance(
            @PathVariable Long teamId,
            @PathVariable Long matchId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        log.info("User {} getting attendance for match {} in team {}",
                userPrincipal.getUserId(), matchId, teamId);

        List<TeamMatchAttendanceResponse> response = teamMatchService.getMatchAttendance(
                teamId,
                matchId,
                userPrincipal.getUserId(),
                userPrincipal.getEmail());

        return ResponseEntity.ok(response);
    }

    /**
     * Admin/owner view: attendance grouped by status (ATTENDING / NOT_ATTENDING / PENDING).
     */
    @GetMapping("/{matchId}/attendance/summary")
    public ResponseEntity<MatchAttendanceSummaryResponse> getMatchAttendanceSummary(
            @PathVariable Long teamId,
            @PathVariable Long matchId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        MatchAttendanceSummaryResponse response = teamMatchService.getMatchAttendanceSummary(
                teamId,
                matchId,
                userPrincipal.getUserId(),
                userPrincipal.getEmail());

        return ResponseEntity.ok(response);
    }

    /**
     * Admin/owner action: override attendance of a specific player.
     * Accepts: ATTENDING, NOT_ATTENDING, PENDING
     */
    @PutMapping("/{matchId}/attendance/{userId}")
    public ResponseEntity<MatchAttendanceSummaryResponse> setAttendanceAsOwner(
            @PathVariable Long teamId,
            @PathVariable Long matchId,
            @PathVariable Long userId,
            @Valid @RequestBody AdminSetAttendanceRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        MatchAttendanceSummaryResponse response = teamMatchService.setAttendanceAsOwner(
                teamId,
                matchId,
                userId,
                request.getStatus(),
                userPrincipal.getUserId(),
                userPrincipal.getEmail());

        return ResponseEntity.ok(response);
    }

    // ============================
    // Match teams (lineups)
    // ============================

    @PostMapping("/{matchId}/teams")
    public ResponseEntity<TeamMatchTeamResponse> createMatchTeam(
            @PathVariable Long teamId,
            @PathVariable Long matchId,
            @Valid @RequestBody TeamMatchTeamCreateRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        TeamMatchTeamResponse response = teamMatchTeamService.createMatchTeam(
                teamId,
                matchId,
                request,
                userPrincipal.getUserId());

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/{matchId}/teams/bulk")
    public ResponseEntity<List<TeamMatchTeamResponse>> bulkCreateMatchTeams(
            @PathVariable Long teamId,
            @PathVariable Long matchId,
            @Valid @RequestBody BulkCreateMatchTeamsRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        List<TeamMatchTeamResponse> response = teamMatchTeamService.bulkCreateMatchTeams(
                teamId,
                matchId,
                request.getTeams(),
                userPrincipal.getUserId());

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{matchId}/teams")
    public ResponseEntity<List<TeamMatchTeamResponse>> listMatchTeams(
            @PathVariable Long teamId,
            @PathVariable Long matchId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        List<TeamMatchTeamResponse> response = teamMatchTeamService.listMatchTeams(
                teamId,
                matchId,
                userPrincipal.getUserId());

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{matchId}/teams/{matchTeamId}")
    public ResponseEntity<TeamMatchTeamResponse> updateMatchTeam(
            @PathVariable Long teamId,
            @PathVariable Long matchId,
            @PathVariable Long matchTeamId,
            @Valid @RequestBody TeamMatchTeamCreateRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        TeamMatchTeamResponse response = teamMatchTeamService.updateMatchTeam(
                teamId,
                matchId,
                matchTeamId,
                request,
                userPrincipal.getUserId());

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{matchId}/teams/{matchTeamId}")
    public ResponseEntity<Void> deleteMatchTeam(
            @PathVariable Long teamId,
            @PathVariable Long matchId,
            @PathVariable Long matchTeamId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        teamMatchTeamService.deleteMatchTeam(teamId, matchId, matchTeamId, userPrincipal.getUserId());
        return ResponseEntity.noContent().build();
    }

    /**
     * Assign/move a player into a match team (drag & drop).
     * User must be ATTENDING.
     */
    @PutMapping("/{matchId}/teams/{matchTeamId}/players/{userId}")
    public ResponseEntity<TeamMatchTeamResponse> upsertPlayer(
            @PathVariable Long teamId,
            @PathVariable Long matchId,
            @PathVariable Long matchTeamId,
            @PathVariable Long userId,
            @Valid @RequestBody MatchTeamPlayerUpsertRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        TeamMatchTeamResponse response = teamMatchTeamService.upsertPlayer(
                teamId,
                matchId,
                matchTeamId,
                userId,
                request,
                userPrincipal.getUserId());

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{matchId}/teams/{matchTeamId}/players/{userId}")
    public ResponseEntity<TeamMatchTeamResponse> removePlayer(
            @PathVariable Long teamId,
            @PathVariable Long matchId,
            @PathVariable Long matchTeamId,
            @PathVariable Long userId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        TeamMatchTeamResponse response = teamMatchTeamService.removePlayer(
                teamId,
                matchId,
                matchTeamId,
                userId,
                userPrincipal.getUserId());

        return ResponseEntity.ok(response);
    }

        /**
         * Notify players (EMAIL + optional SMS/WHATSAPP) with match details and final teams.
         * Only owner.
         */
        @PostMapping("/{matchId}/teams/notify")
        public ResponseEntity<MatchTeamsNotificationResponse> notifyMatchTeams(
                        @PathVariable Long teamId,
                        @PathVariable Long matchId,
                        @AuthenticationPrincipal UserPrincipal userPrincipal) {

                MatchTeamsNotificationResponse response = teamMatchLineupNotificationService.notifyMatchTeams(
                                teamId,
                                matchId,
                                userPrincipal.getUserId());

                return ResponseEntity.ok(response);
        }

    // ============================
    // Match result (goals / own-goals) + historical stats
    // ============================

    /**
     * Admin/owner action: upsert match result.
     */
    @PutMapping("/{matchId}/result")
    public ResponseEntity<MatchResultResponse> upsertMatchResult(
            @PathVariable Long teamId,
            @PathVariable Long matchId,
            @Valid @RequestBody MatchResultUpsertRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        MatchResultResponse response = teamMatchResultService.upsertMatchResult(
                teamId,
                matchId,
                request,
                userPrincipal.getUserId());

        return ResponseEntity.ok(response);
    }

        /**
         * Notify players (EMAIL + optional SMS/WHATSAPP) with the finished match result and scorers.
         * Only owner.
         */
        @PostMapping("/{matchId}/result/notify")
        public ResponseEntity<MatchResultNotificationResponse> notifyMatchResult(
                        @PathVariable Long teamId,
                        @PathVariable Long matchId,
                        @AuthenticationPrincipal UserPrincipal userPrincipal) {

                MatchResultNotificationResponse response = teamMatchResultNotificationService.notifyMatchResult(
                                teamId,
                                matchId,
                                userPrincipal.getUserId());

                return ResponseEntity.ok(response);
        }

    /**
     * View match result (owner or approved member).
     */
    @GetMapping("/{matchId}/result")
    public ResponseEntity<MatchResultResponse> getMatchResult(
            @PathVariable Long teamId,
            @PathVariable Long matchId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        MatchResultResponse response = teamMatchResultService.getMatchResult(
                teamId,
                matchId,
                userPrincipal.getUserId(),
                userPrincipal.getEmail());

        return ResponseEntity.ok(response);
    }

    /**
     * Historical goal stats per player for this team (owner or approved member).
     */
    @GetMapping("/stats/players")
    public ResponseEntity<List<PlayerHistoricalStatsResponse>> getTeamPlayerHistoricalStats(
            @PathVariable Long teamId,
            @RequestParam(name = "limit", defaultValue = "50") int limit,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        List<PlayerHistoricalStatsResponse> response = teamMatchResultService.getTeamPlayerHistoricalStats(
                teamId,
                userPrincipal.getUserId(),
                userPrincipal.getEmail(),
                limit);

        return ResponseEntity.ok(response);
    }
}
