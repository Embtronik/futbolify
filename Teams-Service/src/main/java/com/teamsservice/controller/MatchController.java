package com.teamsservice.controller;

import com.teamsservice.dto.TeamMatchResponse;
import com.teamsservice.security.UserPrincipal;
import com.teamsservice.service.TeamMatchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/matches")
@RequiredArgsConstructor
@Slf4j
public class MatchController {

    private final TeamMatchService teamMatchService;

    @PostMapping("/mis-partidos")
    public ResponseEntity<List<TeamMatchResponse>> getMisPartidos(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestBody(required = false) Map<String, Object> request) {

        log.info("Getting mis-partidos for user email={} payloadKeys={}",
                userPrincipal.getEmail(), request != null ? request.keySet() : List.of());

        List<TeamMatchResponse> response = teamMatchService.getMyMatches(userPrincipal.getEmail());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/mis-partidos")
    public ResponseEntity<List<TeamMatchResponse>> getMisPartidosGet(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        List<TeamMatchResponse> response = teamMatchService.getMyMatches(userPrincipal.getEmail());
        return ResponseEntity.ok(response);
    }
}
