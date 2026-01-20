package com.teamsservice.controller;

import com.teamsservice.dto.stats.StatsTeamAccessResponse;
import com.teamsservice.security.UserPrincipal;
import com.teamsservice.service.TeamStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class StatsController {

    private final TeamStatsService teamStatsService;

    /**
     * Lista los equipos a los que el usuario puede acceder para ver estadísticas.
     * Incluye equipos donde es OWNER y donde es MEMBER (aprobado).
     */
    @GetMapping("/teams")
    public ResponseEntity<List<StatsTeamAccessResponse>> getAccessibleTeams(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        return ResponseEntity.ok(teamStatsService.getAccessibleTeams(userPrincipal.getUserId()));
    }
}
