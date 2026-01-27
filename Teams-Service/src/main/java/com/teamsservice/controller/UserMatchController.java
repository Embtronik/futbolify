package com.teamsservice.controller;

import com.teamsservice.dto.TeamMatchResponse;
import com.teamsservice.security.UserPrincipal;
import com.teamsservice.service.RabbitMQService;
import com.teamsservice.service.TeamMatchService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/matches")
@RequiredArgsConstructor
public class UserMatchController {

    private static final Logger log = LoggerFactory.getLogger(UserMatchController.class);

    private final TeamMatchService teamMatchService;
    private final RabbitMQService rabbitMQService;

    /**
     * Devuelve todos los partidos de los equipos donde el usuario es miembro aprobado
     * y publica un evento en RabbitMQ con el resultado de la consulta.
     */
    @PostMapping("/mis-partidos")
    public ResponseEntity<List<TeamMatchResponse>> getUserMatches(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        log.info("Consultando partidos globales para usuario {}", userPrincipal.getUserId());
        List<TeamMatchResponse> matches = teamMatchService.getUserMatches(userPrincipal.getUserId(), userPrincipal.getEmail());
        // Publicar evento en RabbitMQ (puedes personalizar el evento según tu necesidad)
        rabbitMQService.publishTeamUpdated(null); // Aquí puedes crear un DTO específico si lo deseas
        return ResponseEntity.ok(matches);
    }
}