package com.teamsservice.controller;

import com.teamsservice.dto.ApproveMemberRequest;
import com.teamsservice.dto.JoinTeamRequest;
import com.teamsservice.dto.TeamMemberResponse;
import com.teamsservice.security.UserPrincipal;
import com.teamsservice.service.TeamMemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
@Slf4j
public class TeamMemberController {

    private final TeamMemberService teamMemberService;

    /**
     * Solicitar unirse a un equipo usando el código de 6 dígitos
     */
    @PostMapping("/join/{joinCode}")
    public ResponseEntity<TeamMemberResponse> joinTeam(
            @PathVariable String joinCode,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        log.info("User {} requesting to join team with code: {}", 
                userPrincipal.getUserId(), joinCode);
        
        JoinTeamRequest request = new JoinTeamRequest();
        request.setJoinCode(joinCode);
        
        TeamMemberResponse response = teamMemberService.requestToJoinTeam(
                request, 
                userPrincipal.getUserId(), 
                userPrincipal.getEmail()
        );
        
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Obtener solicitudes pendientes de un equipo (solo owner)
     */
    @GetMapping("/{teamId}/pending-requests")
    public ResponseEntity<List<TeamMemberResponse>> getPendingRequests(
            @PathVariable Long teamId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        log.info("Getting pending requests for team {} by user {}", 
                teamId, userPrincipal.getUserId());
        
        List<TeamMemberResponse> response = teamMemberService.getPendingRequests(
                teamId, userPrincipal.getUserId(), userPrincipal.getEmail());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Aprobar o rechazar una solicitud de membresía (solo owner)
     */
    @PutMapping("/{teamId}/members/{memberId}")
    public ResponseEntity<TeamMemberResponse> approveMembership(
            @PathVariable Long teamId,
            @PathVariable Long memberId,
            @Valid @RequestBody ApproveMemberRequest request,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        g.info("User {} {} membership {} for team {}", 
                userPrincipal.getUserId(), 
                request.getApproved() ? "approving" : "rejecting",
                memberId, teamId);
        
        TeamMemberResponse response = teamMemberService.approveMembershipRequest(
                teamId, memberId, request, userPrincipal.getUserId(), userPrincipal.getEmail());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Obtener todos los miembros aprobados de un equipo
     */
    @GetMapping("/{teamId}/members")
    public ResponseEntity<List<TeamMemberResponse>> getTeamMembers(
            @PathVariable Long teamId,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        g.info("Getting members for team {} by user {}", teamId, userPrincipal.getUserId());
        
        List<TeamMemberResponse> response = teamMemberService.getTeamMembers(
                teamId, userPrincipal.getUserId(), userPrincipal.getEmail());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Obtener los equipos a los que pertenece el usuario autenticado
     */
    @GetMapping("/my-memberships")
    public ResponseEntity<List<TeamMemberResponse>> getMyMemberships(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        
        g.info("Getting memberships for user {}", userPrincipal.getUserId());
        
        List<TeamMemberResponse> response = teamMemberService.getUserMemberships(
                userPrincipal.getUserId(), userPrincipal.getEmail());
        
        return ResponseEntity.ok(response);
    }
}
