package com.teamsservice.service;

import com.teamsservice.dto.ApproveMemberRequest;
import com.teamsservice.dto.JoinTeamRequest;
import com.teamsservice.dto.TeamMemberResponse;
import com.teamsservice.entity.Team;
import com.teamsservice.entity.TeamMember;
import com.teamsservice.entity.TeamStatus;
import com.teamsservice.exception.DuplicateResourceException;
import com.teamsservice.exception.ResourceNotFoundException;
import com.teamsservice.exception.UnauthorizedException;
import com.teamsservice.repository.TeamMemberRepository;
import com.teamsservice.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TeamMemberService {

    private final TeamMemberRepository teamMemberRepository;
    private final TeamRepository teamRepository;
    private final AuthServiceClient authServiceClient;

    /**
     * Solicitar unirse a un equipo usando el código de unión
     */
    @Transactional
    public TeamMemberResponse requestToJoinTeam(JoinTeamRequest request, Long userId, String userEmail) {
        log.info("User {} requesting to join team with code: {}", userId, request.getJoinCode());

        // Buscar equipo por código (solo activos)
        Team team = teamRepository.findByJoinCodeAndStatus(request.getJoinCode().toUpperCase(), TeamStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found with code: " + request.getJoinCode()));

        // Verificar que el usuario no sea el propietario
        // Para OAuth2 users (userId=0), comparar por email
        boolean isOwner = (userId != 0 && team.getOwnerUserId().equals(userId)) ||
                          (userId == 0 && team.getOwnerEmail().equalsIgnoreCase(userEmail));
        if (isOwner) {
            throw new IllegalArgumentException("You are already the owner of this team");
        }

        // Verificar si ya existe una solicitud
        if (teamMemberRepository.existsByTeamIdAndUserId(team.getId(), userId)) {
            throw new DuplicateResourceException("You already have a membership request for this team");
        }

        // Crear solicitud de membresía
        TeamMember teamMember = TeamMember.builder()
                .team(team)
                .userId(userId)
                .userEmail(userEmail)
                .status(TeamMember.MembershipStatus.PENDING)
                .build();

        teamMember = teamMemberRepository.save(teamMember);
        log.info("Membership request created: {}", teamMember.getId());

        return mapToResponse(teamMember);
    }

    /**
     * Obtener todas las solicitudes pendientes de un equipo (solo owner)
     */
    @Transactional(readOnly = true)
    public List<TeamMemberResponse> getPendingRequests(Long teamId, String userEmail) {
        log.info("Getting pending requests for team {} by user {}", teamId, userEmail);

        Team team = teamRepository.findByIdAndStatus(teamId, TeamStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found with id: " + teamId));

        if (!team.getOwnerEmail().equalsIgnoreCase(userEmail)) {
            throw new UnauthorizedException("Only team owner can view pending requests");
        }

        List<TeamMember> pendingMembers = teamMemberRepository.findByTeamIdAndStatus(
                teamId, TeamMember.MembershipStatus.PENDING);

        return pendingMembers.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Aprobar o rechazar una solicitud de membresía (solo owner)
     */
    @Transactional
    public TeamMemberResponse approveMembershipRequest(Long teamId, Long memberId,
                                                       ApproveMemberRequest request, String userEmail) {
        log.info("User {} {} membership {} for team {}",
                userEmail, request.getApproved() ? "approving" : "rejecting", memberId, teamId);

        Team team = teamRepository.findByIdAndStatus(teamId, TeamStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found with id: " + teamId));

        if (!team.getOwnerEmail().equalsIgnoreCase(userEmail)) {
            throw new UnauthorizedException("Only team owner can approve membership requests");
        }

        // Buscar la solicitud de membresía
        TeamMember teamMember = teamMemberRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Membership request not found with id: " + memberId));

        // Verificar que la solicitud pertenezca al equipo correcto
        if (!teamMember.getTeam().getId().equals(teamId)) {
            throw new IllegalArgumentException("Membership request does not belong to this team");
        }

        // Verificar que esté en estado PENDING
        if (teamMember.getStatus() != TeamMember.MembershipStatus.PENDING) {
            throw new IllegalArgumentException("Membership request is not pending");
        }

        // Actualizar estado
        teamMember.setStatus(request.getApproved() 
                ? TeamMember.MembershipStatus.APPROVED 
                : TeamMember.MembershipStatus.REJECTED);
        teamMember.setApprovedBy(team.getOwnerUserId());
        teamMember.setApprovedAt(LocalDateTime.now());

        teamMember = teamMemberRepository.save(teamMember);
        log.info("Membership {} {}", memberId, teamMember.getStatus());

        return mapToResponse(teamMember);
    }

    /**
     * Obtener todos los miembros aprobados de un equipo
     */
    @Transactional(readOnly = true)
    public List<TeamMemberResponse> getTeamMembers(Long teamId, String userEmail) {
        log.info("Getting approved members for team {} by user {}", teamId, userEmail);

        Team team = teamRepository.findByIdAndStatus(teamId, TeamStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found with id: " + teamId));

        // Propietario siempre tiene acceso
        boolean isOwner = team.getOwnerEmail().equalsIgnoreCase(userEmail);
        // Miembro aprobado también tiene acceso
        boolean isMember = teamMemberRepository.existsByTeamIdAndUserEmailAndStatus(
                teamId, userEmail, TeamMember.MembershipStatus.APPROVED);

        if (!isOwner && !isMember) {
            throw new UnauthorizedException("You are not a member of this team");
        }

        List<TeamMember> members = teamMemberRepository.findApprovedMembersByTeamId(teamId);

        return members.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Obtener los equipos a los que pertenece un usuario
     */
    @Transactional(readOnly = true)
    public List<TeamMemberResponse> getUserMemberships(String userEmail) {
        log.info("Getting team memberships for user {}", userEmail);

        List<TeamMember> memberships = teamMemberRepository.findApprovedTeamsByUserEmail(userEmail);

        return memberships.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Contar miembros aprobados de un equipo
     */
    public long countApprovedMembers(Long teamId) {
        return teamMemberRepository.countByTeamIdAndStatus(teamId, TeamMember.MembershipStatus.APPROVED);
    }

    /**
     * Mapear entidad a DTO y enriquecer con información del usuario
     */
    private TeamMemberResponse mapToResponse(TeamMember teamMember) {
        TeamMemberResponse response = TeamMemberResponse.builder()
                .id(teamMember.getId())
                .teamId(teamMember.getTeam().getId())
                .teamName(teamMember.getTeam().getName())
                .userId(teamMember.getUserId())
                .userEmail(teamMember.getUserEmail())
                .status(teamMember.getStatus().name())
                .requestedAt(teamMember.getRequestedAt())
                .approvedAt(teamMember.getApprovedAt())
                .approvedBy(teamMember.getApprovedBy())
                .build();
        
        // Enriquecer con información del usuario desde auth-service
        try {
            response.setUserInfo(authServiceClient.getUserByEmail(teamMember.getUserEmail()));
        } catch (Exception e) {
            log.warn("Could not fetch user info for email {}: {}", teamMember.getUserEmail(), e.getMessage());
        }
        
        return response;
    }
}
