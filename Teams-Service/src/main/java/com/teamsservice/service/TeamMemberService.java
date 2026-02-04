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

        String normalizedEmail = userEmail != null ? userEmail.trim().toLowerCase() : null;

        // Buscar equipo por código (solo activos)
        Team team = teamRepository.findByJoinCodeAndStatus(request.getJoinCode().toUpperCase(), TeamStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found with code: " + request.getJoinCode()));

        // Verificar que el usuario no sea el propietario
        // Comparar por userId (si disponible) o por email
        boolean isOwner = (userId != null && userId != 0L && team.getOwnerUserId() != null && team.getOwnerUserId().equals(userId)) ||
                          (normalizedEmail != null && team.getOwnerEmail() != null && team.getOwnerEmail().equalsIgnoreCase(normalizedEmail));
        if (isOwner) {
            throw new IllegalArgumentException("You are already the owner of this team");
        }

        // Verificar si ya existe una solicitud (por email). Esto soporta OAuth y evita duplicados
        // cuando hay registros legacy con userId=0.
        if (normalizedEmail != null && teamMemberRepository.existsByTeamIdAndUserEmailIgnoreCase(team.getId(), normalizedEmail)) {
            throw new DuplicateResourceException("You already have a membership request for this team");
        }

        // Crear solicitud de membresía
        TeamMember teamMember = TeamMember.builder()
                .team(team)
                .userId(userId)
            .userEmail(normalizedEmail)
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
    public List<TeamMemberResponse> getPendingRequests(Long teamId, Long userId, String userEmail) {
        log.info("Getting pending requests for team {} by user {}", teamId, userId);

        // Verificar que el usuario sea el propietario (solo equipos activos)
        Team team = teamRepository.findByIdAndStatus(teamId, TeamStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found with id: " + teamId));

        boolean isOwner = (userId != null && userId != 0L && team.getOwnerUserId() != null && team.getOwnerUserId().equals(userId)) ||
            (userEmail != null && team.getOwnerEmail() != null && team.getOwnerEmail().equalsIgnoreCase(userEmail));
        if (!isOwner) {
            throw new UnauthorizedException("Only team owner can view pending requests");
        }

        List<TeamMember> pendingMembers = teamMemberRepository.findByTeamIdAndStatus(
                teamId, TeamMember.MembershipStatus.PENDING);

        return pendingMembers.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Aprobar o rechazar una solicitud de membresía
     */
    @Transactional
    public TeamMemberResponse approveMembershipRequest(Long teamId, Long memberId, 
                                   ApproveMemberRequest request, Long userId, String userEmail) {
        log.info("User {} {} membership {} for team {}", 
                userId, request.getApproved() ? "approving" : "rejecting", memberId, teamId);

        // Verificar que el usuario sea el propietario del equipo (solo activos)
        Team team = teamRepository.findByIdAndStatus(teamId, TeamStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found with id: " + teamId));

        boolean isOwner = (userId != null && userId != 0L && team.getOwnerUserId() != null && team.getOwnerUserId().equals(userId)) ||
            (userEmail != null && team.getOwnerEmail() != null && team.getOwnerEmail().equalsIgnoreCase(userEmail));
        if (!isOwner) {
            throw new UnauthorizedException("Only team owner can approve membership requests");
        }

        // Buscar la solicitud de membresía
        TeamMember teamMember = teamMemberRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Membership request not found with id: " + memberId));

        // Verificar que la solicitud pertenezca al equipo correcto
        if (!teamMember.getTeam().getId().equals(teamId)) {
            throw new IllegalArgumentException("Membership request does not belong to this team");
        }

        // Permitir transición:
        // PENDING -> APPROVED/REJECTED
        // APPROVED <-> REJECTED
        TeamMember.MembershipStatus current = teamMember.getStatus();
        TeamMember.MembershipStatus target = request.getApproved() 
                ? TeamMember.MembershipStatus.APPROVED 
                : TeamMember.MembershipStatus.REJECTED;

        boolean allowed = false;
        if (current == TeamMember.MembershipStatus.PENDING) {
            allowed = true;
        } else if (current == TeamMember.MembershipStatus.APPROVED && target == TeamMember.MembershipStatus.REJECTED) {
            allowed = true;
        } else if (current == TeamMember.MembershipStatus.REJECTED && target == TeamMember.MembershipStatus.APPROVED) {
            allowed = true;
        }

        if (!allowed) {
            throw new IllegalArgumentException("Cannot change membership from " + current + " to " + target);
        }

        teamMember.setStatus(target);
        teamMember.setApprovedBy(userId);
        teamMember.setApprovedAt(LocalDateTime.now());

        teamMember = teamMemberRepository.save(teamMember);
        log.info("Membership {} {}", memberId, teamMember.getStatus());

        return mapToResponse(teamMember);
    }

    /**
     * Obtener todos los miembros aprobados de un equipo
     */
    @Transactional(readOnly = true)
    public List<TeamMemberResponse> getTeamMembers(Long teamId, Long userId, String userEmail) {
        log.info("Getting all members (all statuses) for team {} by user {}", teamId, userId);

        // Verificar que el equipo existe y está activo
        Team team = teamRepository.findByIdAndStatus(teamId, TeamStatus.ACTIVE)
            .orElseThrow(() -> new ResourceNotFoundException("Team not found with id: " + teamId));

        // Verificar que el usuario sea el propietario o miembro aprobado
        boolean isOwner = (userId != null && userId != 0L && team.getOwnerUserId() != null && team.getOwnerUserId().equals(userId)) ||
            (userEmail != null && team.getOwnerEmail() != null && team.getOwnerEmail().equalsIgnoreCase(userEmail));
        if (!isOwner) {
            boolean isApprovedMember = false;
            
            // Buscar primero por email (más confiable para OAuth2)
            if (userEmail != null && !userEmail.isEmpty()) {
                isApprovedMember = teamMemberRepository.existsByTeamIdAndUserEmailAndStatus(
                    teamId, userEmail, TeamMember.MembershipStatus.APPROVED);
            }
            
            // Si no se encontró por email y hay userId válido, buscar por userId
            if (!isApprovedMember && userId != null && userId != 0L) {
                isApprovedMember = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                    .map(m -> m.getStatus() == TeamMember.MembershipStatus.APPROVED)
                    .orElse(false);
            }

            if (!isApprovedMember) {
                throw new UnauthorizedException("You are not a member of this team");
            }
        }

        // Obtener todos los miembros (cualquier estado)
        List<TeamMember> members = teamMemberRepository.findByTeamId(teamId);

        return members.stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }

    /**
     * Obtener los equipos a los que pertenece un usuario
     */
    @Transactional(readOnly = true)
    public List<TeamMemberResponse> getUserMemberships(Long userId, String userEmail) {
        log.info("Getting team memberships for user {} (email: {})", userId, userEmail);

        List<TeamMember> memberships;
        // Buscar primero por email (más confiable para OAuth2)
        if (userEmail != null && !userEmail.isEmpty()) {
            memberships = teamMemberRepository.findApprovedTeamsByUserEmail(userEmail);
        } else if (userId != null && userId != 0L) {
            // Fallback: buscar por userId solo si no hay email
            memberships = teamMemberRepository.findApprovedTeamsByUserId(userId);
        } else {
            memberships = List.of();
        }

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
