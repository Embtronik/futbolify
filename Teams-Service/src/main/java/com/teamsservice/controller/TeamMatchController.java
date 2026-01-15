package com.teamsservice.controller;

import com.teamsservice.dto.PageResponse;
import com.teamsservice.dto.TeamMatchCreateRequest;
import com.teamsservice.dto.TeamMatchResponse;
import com.teamsservice.dto.TeamMatchAttendanceResponse;
import com.teamsservice.security.UserPrincipal;
import com.teamsservice.service.TeamMatchService;
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
}
