package com.teamsservice.service;

import com.teamsservice.dto.ApproveMemberRequest;
import com.teamsservice.dto.JoinTeamRequest;
import com.teamsservice.dto.NotificationSendRequest;
import com.teamsservice.dto.TeamMemberResponse;
import com.teamsservice.dto.UserInfoDto;
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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TeamMemberService {

    private final TeamMemberRepository teamMemberRepository;
    private final TeamRepository teamRepository;
    private final AuthServiceClient authServiceClient;
    private final NotificationServiceClient notificationServiceClient;

    @Value("${app.frontend.url:http://localhost:4200}")
    private String frontendUrl;

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
        // Para OAuth2 users (userId=null), comparar por email
        boolean isOwner = (userId != null && team.getOwnerUserId().equals(userId)) ||
                          (userId == null && team.getOwnerEmail().equalsIgnoreCase(userEmail));
        if (isOwner) {
            throw new IllegalArgumentException("You are already the owner of this team");
        }

        // Verificar si ya existe una solicitud (OAuth2 users have userId=null, check by email)
        boolean alreadyExists = (userId != null)
                ? teamMemberRepository.existsByTeamIdAndUserId(team.getId(), userId)
                : teamMemberRepository.existsByTeamIdAndUserEmail(team.getId(), userEmail);
        if (alreadyExists) {
            throw new DuplicateResourceException("You already have a membership request for this team");
        }

        // Crear solicitud de membresía (aprobada automáticamente)
        TeamMember teamMember = TeamMember.builder()
                .team(team)
                .userId(userId)
                .userEmail(userEmail)
                .status(TeamMember.MembershipStatus.APPROVED)
                .approvedBy(team.getOwnerUserId())
                .approvedAt(LocalDateTime.now())
                .build();

        teamMember = teamMemberRepository.save(teamMember);
        log.info("Membership auto-approved: {}", teamMember.getId());

        notifyOwnerOfJoinRequest(team, userEmail);

        return mapToResponse(teamMember);
    }

    /**
     * Notifica al propietario del equipo que hay una nueva solicitud de membresía.
     * Envía por email siempre, y por SMS/WhatsApp si el propietario tiene teléfono registrado.
     */
    private void notifyOwnerOfJoinRequest(Team team, String requesterEmail) {
        try {
            UserInfoDto requesterInfo = authServiceClient.getUserByEmail(requesterEmail);
            String requesterName = (requesterInfo != null)
                    ? requesterInfo.getFullName().trim()
                    : requesterEmail;

            UserInfoDto ownerInfo = authServiceClient.getUserByEmail(team.getOwnerEmail());

            String subject = "Nueva solicitud para unirse a " + team.getName();

            String pendingUrl = frontendUrl + "/dashboard/teams/" + team.getId() + "/pending-requests";
            String body = "Hola" + (ownerInfo != null ? " " + ownerInfo.getFirstName() : "") + ",\n\n"
                    + requesterName + " (" + requesterEmail + ") ha solicitado unirse a tu equipo \""
                    + team.getName() + "\".\n\n"
                    + "Puedes aprobar o rechazar la solicitud desde:\n"
                    + pendingUrl + "\n\n"
                    + "— Futbolify";

            String ownerPhone = null;
            if (ownerInfo != null
                    && ownerInfo.getCountryCode() != null
                    && ownerInfo.getPhoneNumber() != null) {
                ownerPhone = ownerInfo.getCountryCode() + ownerInfo.getPhoneNumber();
            }

            List<String> channels = new ArrayList<>();
            channels.add("EMAIL");
            if (ownerPhone != null && !ownerPhone.isBlank()) {
                channels.add("WHATSAPP");
                channels.add("SMS");
            }

            NotificationSendRequest notification = NotificationSendRequest.builder()
                    .channels(channels)
                    .recipient(team.getOwnerEmail())
                    .recipientPhone(ownerPhone)
                    .subject(subject)
                    .body(body)
                    .serviceOrigin("teams-service")
                    .build();

            notificationServiceClient.sendNotification(notification);
        } catch (Exception e) {
            // La notificación falla silenciosamente para no bloquear la solicitud de membresía
            log.warn("Could not notify owner {} of new join request for team {}: {}",
                    team.getOwnerEmail(), team.getId(), e.getMessage());
        }
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
     * Aprobar o rechazar una solicitud de membresía por email del solicitante (solo owner)
     */
    @Transactional
    public TeamMemberResponse approveMembershipRequestByEmail(Long teamId, String memberEmail,
                                                              ApproveMemberRequest request, String ownerEmail) {
        log.info("User {} {} membership for member email {} in team {}",
                ownerEmail, request.getApproved() ? "approving" : "rejecting", memberEmail, teamId);

        Team team = teamRepository.findByIdAndStatus(teamId, TeamStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found with id: " + teamId));

        if (!team.getOwnerEmail().equalsIgnoreCase(ownerEmail)) {
            throw new UnauthorizedException("Only team owner can approve membership requests");
        }

        TeamMember teamMember = teamMemberRepository.findByTeamIdAndUserEmailAndStatus(
                        teamId, memberEmail, TeamMember.MembershipStatus.PENDING)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No pending membership request found for email: " + memberEmail));

        teamMember.setStatus(request.getApproved()
                ? TeamMember.MembershipStatus.APPROVED
                : TeamMember.MembershipStatus.REJECTED);
        teamMember.setApprovedBy(team.getOwnerUserId());
        teamMember.setApprovedAt(LocalDateTime.now());

        teamMember = teamMemberRepository.save(teamMember);
        log.info("Membership for email {} {}", memberEmail, teamMember.getStatus());

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
