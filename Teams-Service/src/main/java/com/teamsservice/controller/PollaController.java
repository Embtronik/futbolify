package com.teamsservice.controller;

import com.teamsservice.dto.*;
import com.teamsservice.security.UserPrincipal;
import com.teamsservice.service.PollaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/pollas")
@RequiredArgsConstructor
@Slf4j
public class PollaController {
    private final PollaService pollaService;

    /* ...resto de endpoints y lógica existente...
     * GET /api/pollas/mis-pollas - Obtener todas las pollas del usuario (creadas o como participante)
     */
    @GetMapping("/mis-pollas")
    public ResponseEntity<List<PollaResponse>> getMisPollas(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        log.info("Getting all pollas for user: {}", userPrincipal.getEmail());
        
        List<PollaResponse> pollas = pollaService.getMisPollas(userPrincipal.getEmail());
        
        return ResponseEntity.ok(pollas);
    }

    /**
     * GET /api/pollas/{id} - Obtener detalle completo de una polla
     */
    @GetMapping("/{id}")
    public ResponseEntity<PollaResponse> getPolla(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        log.info("Getting polla {} for user {}", id, userPrincipal.getEmail());
        
        PollaResponse response = pollaService.getPolla(id, userPrincipal.getEmail());
        
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/pollas/{id}/aceptar - Aceptar invitación a una polla
     */
    @PostMapping("/{id}/aceptar")
    public ResponseEntity<Void> aceptarInvitacion(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        log.info("User {} accepting invitation to polla {}", userPrincipal.getEmail(), id);
        
        pollaService.aceptarInvitacion(id, userPrincipal.getEmail());
        
        return ResponseEntity.ok().build();
    }

    /**
     * POST /api/pollas/{id}/rechazar - Rechazar invitación a una polla
     */
    @PostMapping("/{id}/rechazar")
    public ResponseEntity<Void> rechazarInvitacion(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        log.info("User {} rejecting invitation to polla {}", userPrincipal.getEmail(), id);
        
        pollaService.rechazarInvitacion(id, userPrincipal.getEmail());
        
        return ResponseEntity.ok().build();
    }

    /**
     * POST /api/pollas/{id}/partidos - Agregar un partido a la polla
     */
    @PostMapping("/{id}/partidos")
    public ResponseEntity<PartidoResponse> agregarPartido(
            @PathVariable Long id,
            @Valid @RequestBody PartidoRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        log.info("Adding match to polla {} by user {}", id, userPrincipal.getEmail());
        
        PartidoResponse response = pollaService.agregarPartido(id, request, userPrincipal.getEmail());
        
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * GET /api/pollas/{id}/partidos - Obtener todos los partidos de una polla
     */
    @GetMapping("/{id}/partidos")
    public ResponseEntity<List<PartidoResponse>> getPartidos(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        log.info("Getting matches for polla {} by user {}", id, userPrincipal.getEmail());
        
        List<PartidoResponse> partidos = pollaService.getPartidos(id, userPrincipal.getEmail());
        
        return ResponseEntity.ok(partidos);
    }

    /**
     * POST /api/pollas/{id}/pronosticos - Registrar o actualizar pronóstico
     */
    @PostMapping("/{id}/pronosticos")
    public ResponseEntity<PronosticoResponse> registrarPronostico(
            @PathVariable Long id,
            @Valid @RequestBody PronosticoRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        log.info("User {} registering forecast for polla {}", userPrincipal.getEmail(), id);
        
        PronosticoResponse response = pollaService.registrarPronostico(id, request, userPrincipal.getEmail());
        
        return ResponseEntity.ok(response);
    }

        /**
     * PUT /api/pollas/{id}/activar - Activar una polla (cambiar estado a ABIERTA)
     */
    @PutMapping("/{id}/activar")
    public ResponseEntity<Void> activarPolla(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        log.info("Activando polla {} por usuario {}", id, userPrincipal.getEmail());
        pollaService.activarPolla(id, userPrincipal.getEmail());
        return ResponseEntity.ok().build();
    }

        /**
     * PUT /api/pollas/{id}/a-creada - Cambia el estado de la polla a CREADA (solo si está ABIERTA y es el creador)
     */
    @PutMapping("/{id}/a-creada")
    public ResponseEntity<Void> volverACreada(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        log.info("Cambiando polla {} a estado CREADA por usuario {}", id, userPrincipal.getEmail());
        pollaService.volverACreada(id, userPrincipal.getEmail());
        return ResponseEntity.ok().build();
    }
}
