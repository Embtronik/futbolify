package com.teamsservice.controller;

import com.teamsservice.dto.PageResponse;
import com.teamsservice.dto.TeamCreateRequest;
import com.teamsservice.dto.TeamResponse;
import com.teamsservice.dto.TeamUpdateRequest;
import com.teamsservice.security.UserPrincipal;
import com.teamsservice.service.TeamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
public class TeamController {

    private static final Logger log = LoggerFactory.getLogger(TeamController.class);

    private final TeamService teamService;

        @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
        public ResponseEntity<TeamResponse> createTeamJson(
            @Valid @RequestBody TeamCreateRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) throws IOException {

        log.info("Creating team (JSON): {} for user: {}", request.getName(), userPrincipal.getUserId());

        TeamResponse response = teamService.createTeam(request, null, userPrincipal.getUserId(), userPrincipal.getEmail());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<TeamResponse> createTeam(
            @Valid @RequestPart("team") TeamCreateRequest request,
            @RequestPart(value = "logo", required = false) MultipartFile logo,
            @AuthenticationPrincipal UserPrincipal userPrincipal) throws IOException {
        
        log.info("Creating team: {} for user: {}", request.getName(), userPrincipal.getUserId());
        
        TeamResponse response = teamService.createTeam(request, logo, userPrincipal.getUserId(), userPrincipal.getEmail());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{teamId}")
    public ResponseEntity<TeamResponse> getTeam(
            @PathVariable Long teamId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        log.info("Getting team: {} for user: {}", teamId, userPrincipal.getUserId());
        
        TeamResponse response = teamService.getTeam(teamId, userPrincipal.getUserId(), userPrincipal.getEmail());
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<PageResponse<TeamResponse>> getUserTeams(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size) {

        log.info("Getting teams for user: {} (email: {}) page={} size={}",
                userPrincipal.getUserId(), userPrincipal.getEmail(), page, size);

        PageResponse<TeamResponse> response = teamService.getUserTeams(
                userPrincipal.getUserId(), userPrincipal.getEmail(), page, size);
        return ResponseEntity.ok(response);
    }

    @PutMapping(value = "/{teamId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<TeamResponse> updateTeam(
            @PathVariable Long teamId,
            @Valid @RequestPart("team") TeamUpdateRequest request,
            @RequestPart(value = "logo", required = false) MultipartFile logo,
            @AuthenticationPrincipal UserPrincipal userPrincipal) throws IOException {
        
        log.info("Updating team: {} for user: {}", teamId, userPrincipal.getUserId());
        
        TeamResponse response = teamService.updateTeam(teamId, request, logo, 
                userPrincipal.getUserId(), userPrincipal.getEmail());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{teamId}")
    public ResponseEntity<Void> deleteTeam(
            @PathVariable Long teamId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        log.info("Deleting team: {} for user: {}", teamId, userPrincipal.getUserId());
        
        teamService.deleteTeam(teamId, userPrincipal.getUserId(), userPrincipal.getEmail());
        return ResponseEntity.noContent().build();
    }
}
