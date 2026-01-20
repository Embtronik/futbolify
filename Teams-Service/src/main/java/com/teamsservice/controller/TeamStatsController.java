package com.teamsservice.controller;

import com.teamsservice.dto.stats.*;
import com.teamsservice.security.UserPrincipal;
import com.teamsservice.service.TeamStatsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teams/{teamId}/stats")
public class TeamStatsController {

    private final TeamStatsService teamStatsService;

    public TeamStatsController(TeamStatsService teamStatsService) {
        this.teamStatsService = teamStatsService;
    }

    /**
     * Años disponibles (solo partidos finalizados).
     */
    @GetMapping("/years")
    public ResponseEntity<List<Integer>> getYears(
            @PathVariable Long teamId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        return ResponseEntity.ok(teamStatsService.getFinishedYears(teamId, userPrincipal.getUserId(), userPrincipal.getEmail()));
    }

    /**
     * Meses disponibles de un año (solo partidos finalizados).
     */
    @GetMapping("/months")
    public ResponseEntity<List<Integer>> getMonths(
            @PathVariable Long teamId,
            @RequestParam int year,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        return ResponseEntity.ok(teamStatsService.getFinishedMonths(teamId, year, userPrincipal.getUserId(), userPrincipal.getEmail()));
    }

    /**
     * Historial de marcadores (partidos finalizados) por año/mes.
     * month es opcional (si no se envía, trae todo el año paginado).
     */
    @GetMapping("/matches")
    public ResponseEntity<StatsMatchesPageResponse> getMatchHistory(
            @PathVariable Long teamId,
            @RequestParam int year,
            @RequestParam(required = false) Integer month,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        return ResponseEntity.ok(teamStatsService.getFinishedMatchSummaries(
                teamId,
                year,
                month,
                page,
                size,
                userPrincipal.getUserId(),
                userPrincipal.getEmail()));
    }

    /**
     * Top goleadores por año/mes (solo partidos finalizados).
     * month es opcional.
     */
    @GetMapping("/top-scorers")
    public ResponseEntity<List<StatsTopScorerResponse>> getTopScorers(
            @PathVariable Long teamId,
            @RequestParam int year,
            @RequestParam(required = false) Integer month,
            @RequestParam(defaultValue = "20") int limit,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        return ResponseEntity.ok(teamStatsService.getTopScorers(
                teamId,
                year,
                month,
                limit,
                userPrincipal.getUserId(),
                userPrincipal.getEmail()));
    }

    /**
     * Leaderboard: cuál equipo (nombre/color) ganó más partidos en el período.
     * Nota: se agrupa por (name,color) de los equipos del partido.
     */
    @GetMapping("/match-teams/winners")
    public ResponseEntity<List<StatsWinnerRowResponse>> getWinnersLeaderboard(
            @PathVariable Long teamId,
            @RequestParam int year,
            @RequestParam(required = false) Integer month,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        return ResponseEntity.ok(teamStatsService.getMatchTeamWinnersLeaderboard(
                teamId,
                year,
                month,
                userPrincipal.getUserId(),
                userPrincipal.getEmail()));
    }
}
