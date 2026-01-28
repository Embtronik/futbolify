package com.teamsservice.service;
import com.teamsservice.dto.MatchAttendanceSummaryResponse;
import com.teamsservice.dto.NotificationSendRequest;
import com.teamsservice.dto.PageResponse;
import com.teamsservice.dto.TeamMatchAttendanceResponse;
import com.teamsservice.dto.TeamMatchCreateRequest;
import com.teamsservice.dto.TeamMatchResponse;
import com.teamsservice.dto.UserInfoDto;
import com.teamsservice.entity.Team;
import com.teamsservice.entity.TeamMatch;
import com.teamsservice.entity.TeamMember;
import com.teamsservice.entity.TeamStatus;
import com.teamsservice.entity.TeamMatchAttendance;
import com.teamsservice.exception.BusinessRuleException;
import com.teamsservice.exception.ResourceNotFoundException;
import com.teamsservice.exception.UnauthorizedException;
import com.teamsservice.repository.TeamMatchRepository;
import com.teamsservice.repository.TeamMemberRepository;
import com.teamsservice.repository.TeamMatchAttendanceRepository;
import com.teamsservice.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TeamMatchService {

    private final TeamMatchRepository teamMatchRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final TeamMatchAttendanceRepository teamMatchAttendanceRepository;
    private final AuthServiceClient authServiceClient;
    private final NotificationServiceClient notificationServiceClient;
    private final RabbitMQService rabbitMQService;

    @Value("${app.frontend.url:http://localhost:4200}")
    private String frontendUrl;

    @Transactional
    public TeamMatchResponse createTeamMatch(Long teamId, TeamMatchCreateRequest request,
                                             Long currentUserId, String currentUserEmail) {
        log.info("User {} creating match for team {}", currentUserId, teamId);

        Team team = teamRepository.findByIdAndStatus(teamId, TeamStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found with id: " + teamId));

        if (!team.getOwnerUserId().equals(currentUserId)) {
            throw new UnauthorizedException("Only team owner can create matches");
        }

        if (request.getMatchDateTime().isBefore(LocalDateTime.now())) {
            throw new BusinessRuleException("No se pueden crear partidos en el pasado");
        }

        TeamMatch match = TeamMatch.builder()
            .team(team)
            .address(request.getAddress())
            .latitude(request.getLatitude())
            .longitude(request.getLongitude())
            .placeId(request.getPlaceId())
            .matchDateTime(request.getMatchDateTime())
            .build();

        match = teamMatchRepository.save(match);
        log.info("Team match created with id {} for team {}", match.getId(), teamId);

        notifyTeamMembers(team, match);

        return mapToResponse(match);
    }

    @Transactional(readOnly = true)
    public PageResponse<TeamMatchResponse> getTeamMatches(Long teamId, Long currentUserId, String currentUserEmail,
                                                          int page, int size) {
        log.info("User {} listing matches for team {} (page={}, size={})", currentUserId, teamId, page, size);

	Team team = teamRepository.findByIdAndStatus(teamId, TeamStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found with id: " + teamId));

        boolean isOwner = team.getOwnerUserId().equals(currentUserId);
        boolean isApprovedMember = false;
        if (!isOwner) {
            if (currentUserId != null && currentUserId != 0L) {
                isApprovedMember = teamMemberRepository.findByTeamIdAndUserId(teamId, currentUserId)
                        .map(m -> m.getStatus() == TeamMember.MembershipStatus.APPROVED)
                        .orElse(false);
            } else if (currentUserEmail != null) {
                isApprovedMember = teamMemberRepository.existsByTeamIdAndUserEmailAndStatus(
                        teamId, currentUserEmail, TeamMember.MembershipStatus.APPROVED);
            }
            if (!isApprovedMember) {
                throw new UnauthorizedException("You are not a member of this team");
            }
        }

        if (size <= 0) {
            size = 10;
        }
        if (page < 0) {
            page = 0;
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "matchDateTime"));

        Page<TeamMatch> matchesPage = teamMatchRepository.findByTeamId(teamId, pageable);

        List<TeamMatchResponse> content = matchesPage.getContent().stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList());

        return PageResponse.<TeamMatchResponse>builder()
            .content(content)
            .page(matchesPage.getNumber())
            .size(matchesPage.getSize())
            .totalElements(matchesPage.getTotalElements())
            .totalPages(matchesPage.getTotalPages())
            .last(matchesPage.isLast())
            .build();
    }

    @Transactional(readOnly = true)
    public List<TeamMatchAttendanceResponse> getMatchAttendance(Long teamId,
                                                                Long matchId,
                                                                Long currentUserId,
                                                                String currentUserEmail) {
        log.info("User {} listing attendance for match {} in team {}", currentUserId, matchId, teamId);

        TeamMatch match = teamMatchRepository.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("Match not found with id: " + matchId));

        if (!match.getTeam().getId().equals(teamId)) {
            throw new IllegalArgumentException("Match does not belong to this team");
        }

        // Permitir ver la asistencia al owner o a cualquier miembro aprobado
        Team team = match.getTeam();
        boolean isOwner = team.getOwnerUserId().equals(currentUserId);
        boolean isApprovedMember = teamMemberRepository.findByTeamIdAndUserId(teamId, currentUserId)
                .map(m -> m.getStatus() == TeamMember.MembershipStatus.APPROVED)
                .orElse(false);

        if (!isOwner && !isApprovedMember) {
            throw new UnauthorizedException("You are not allowed to view attendance for this match");
        }

        List<TeamMember> members = teamMemberRepository.findApprovedMembersByTeamId(teamId);

        return members.stream().map(member -> {
            TeamMatchAttendance attendance = teamMatchAttendanceRepository
                    .findByMatchIdAndUserId(matchId, member.getUserId())
                    .orElse(null);

            String status = attendance != null ? attendance.getStatus().name() : "PENDING";
            java.time.LocalDateTime respondedAt = attendance != null ? attendance.getUpdatedAt() : null;

            UserInfoDto userInfo = null;
            try {
                if (member.getUserEmail() != null) {
                    userInfo = authServiceClient.getUserByEmail(member.getUserEmail());
                }
            } catch (Exception e) {
                log.warn("Could not fetch user info for email {}: {}", member.getUserEmail(), e.getMessage());
            }

            return TeamMatchAttendanceResponse.builder()
                    .userId(member.getUserId())
                    .userEmail(member.getUserEmail())
                    .status(status)
                    .respondedAt(respondedAt)
                    .userInfo(userInfo)
                    .build();
        }).collect(Collectors.toList());
    }

        @Transactional(readOnly = true)
        public MatchAttendanceSummaryResponse getMatchAttendanceSummary(Long teamId,
                                        Long matchId,
                                        Long currentUserId,
                                        String currentUserEmail) 
                                        {
        List<TeamMatchAttendanceResponse> all = getMatchAttendance(teamId, matchId, currentUserId, currentUserEmail);

        Map<String, List<TeamMatchAttendanceResponse>> byStatus = all.stream()
            .collect(Collectors.groupingBy(r -> r.getStatus() == null ? "PENDING" : r.getStatus()));

        List<TeamMatchAttendanceResponse> attending = byStatus.getOrDefault("ATTENDING", List.of());
        List<TeamMatchAttendanceResponse> notAttending = byStatus.getOrDefault("NOT_ATTENDING", List.of());
        List<TeamMatchAttendanceResponse> pending = byStatus.getOrDefault("PENDING", List.of());

        Comparator<TeamMatchAttendanceResponse> byEmail = Comparator.comparing(
            r -> r.getUserEmail() == null ? "" : r.getUserEmail().toLowerCase(Locale.ROOT)
        );

        attending = attending.stream().sorted(byEmail).collect(Collectors.toList());
        notAttending = notAttending.stream().sorted(byEmail).collect(Collectors.toList());
        pending = pending.stream().sorted(byEmail).collect(Collectors.toList());

        return MatchAttendanceSummaryResponse.builder()
            .attendingCount(attending.size())
            .notAttendingCount(notAttending.size())
            .pendingCount(pending.size())
            .attending(attending)
            .notAttending(notAttending)
            .pending(pending)
            .build();
    }

    @Transactional
    public void confirmAttendance(Long teamId,
                                  Long matchId,
                                  Long userId,
                                  String userEmail,
                                  boolean attending) {
        log.info("User {} setting attendance={} for match {} in team {}", userId, attending, matchId, teamId);

        TeamMatch match = teamMatchRepository.findById(matchId)
            .orElseThrow(() -> new ResourceNotFoundException("Match not found with id: " + matchId));

        if (!match.getTeam().getId().equals(teamId)) {
            throw new IllegalArgumentException("Match does not belong to this team");
        }

        // Validar que el usuario sea miembro aprobado del equipo
        TeamMember membership = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
            .orElseThrow(() -> new UnauthorizedException("You are not a member of this team"));

        if (membership.getStatus() != TeamMember.MembershipStatus.APPROVED) {
            throw new UnauthorizedException("Your membership is not approved");
        }

        TeamMatchAttendance attendance = teamMatchAttendanceRepository
            .findByMatchIdAndUserId(matchId, userId)
            .orElse(TeamMatchAttendance.builder()
                .match(match)
                .userId(userId)
                .userEmail(userEmail)
                .build());

        attendance.setStatus(attending
            ? TeamMatchAttendance.AttendanceStatus.ATTENDING
            : TeamMatchAttendance.AttendanceStatus.NOT_ATTENDING);

        teamMatchAttendanceRepository.save(attendance);
    }

    @Transactional
    public MatchAttendanceSummaryResponse setAttendanceAsOwner(Long teamId,
                                                              Long matchId,
                                                              Long targetUserId,
                                                              String status,
                                                              Long currentUserId,
                                                              String currentUserEmail) {
        TeamMatch match = teamMatchRepository.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("Match not found with id: " + matchId));

        if (!match.getTeam().getId().equals(teamId)) {
            throw new IllegalArgumentException("Match does not belong to this team");
        }

        Team team = match.getTeam();
        if (!team.getOwnerUserId().equals(currentUserId)) {
            throw new UnauthorizedException("Only team owner can manage attendance");
        }

        TeamMember member = teamMemberRepository.findByTeamIdAndUserId(teamId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Team member not found with userId: " + targetUserId));

        if (member.getStatus() != TeamMember.MembershipStatus.APPROVED) {
            throw new UnauthorizedException("Target user is not an approved member of this team");
        }

        String normalized = status == null ? "" : status.trim().toUpperCase(Locale.ROOT);
        switch (normalized) {
            case "ATTENDING" -> {
                upsertAttendance(match, targetUserId, member.getUserEmail(), TeamMatchAttendance.AttendanceStatus.ATTENDING);
            }
            case "NOT_ATTENDING" -> {
                upsertAttendance(match, targetUserId, member.getUserEmail(), TeamMatchAttendance.AttendanceStatus.NOT_ATTENDING);
            }
            case "PENDING" -> {
                teamMatchAttendanceRepository.findByMatchIdAndUserId(matchId, targetUserId)
                        .ifPresent(teamMatchAttendanceRepository::delete);
            }
            default -> throw new IllegalArgumentException("Invalid status. Allowed: ATTENDING, NOT_ATTENDING, PENDING");
        }

        return getMatchAttendanceSummary(teamId, matchId, currentUserId, currentUserEmail);
    }

    private void upsertAttendance(TeamMatch match,
                                 Long userId,
                                 String userEmail,
                                 TeamMatchAttendance.AttendanceStatus status) {
        TeamMatchAttendance attendance = teamMatchAttendanceRepository
                .findByMatchIdAndUserId(match.getId(), userId)
                .orElse(TeamMatchAttendance.builder()
                        .match(match)
                        .userId(userId)
                        .userEmail(userEmail)
                        .build());

        attendance.setUserEmail(userEmail);
        attendance.setStatus(status);
        teamMatchAttendanceRepository.save(attendance);
    }

    private void notifyTeamMembers(Team team, TeamMatch match) {
        List<TeamMember> members = teamMemberRepository.findApprovedMembersByTeamId(team.getId());
        if (members.isEmpty()) {
            log.info("No approved members found for team {} when notifying new match", team.getId());
            return;
        }

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        String formattedDate = match.getMatchDateTime().format(formatter);

        String mapsUrl;
        if (match.getLatitude() != null && match.getLongitude() != null && match.getPlaceId() != null) {
            mapsUrl = String.format(
                    "https://www.google.com/maps/search/?api=1&query=%f,%f&query_place_id=%s",
                    match.getLatitude(),
                    match.getLongitude(),
                    match.getPlaceId()
            );
        } else if (match.getAddress() != null) {
            mapsUrl = "https://www.google.com/maps/search/?api=1&query=" + match.getAddress().replace(" ", "+");
        } else {
            mapsUrl = "https://www.google.com/maps";
        }

        String confirmUrl = String.format("%s/equipos/%d/partidos/%d", frontendUrl, team.getId(), match.getId());

        for (TeamMember member : members) {
            String email = member.getUserEmail();
            if (email == null || email.isBlank()) {
                continue;
            }

            UserInfoDto userInfo = authServiceClient.getUserByEmail(email);

            String phone = null;
            if (userInfo != null && userInfo.getCountryCode() != null && userInfo.getPhoneNumber() != null) {
                phone = userInfo.getCountryCode() + userInfo.getPhoneNumber();
            }

            List<String> channels = new ArrayList<>();
            channels.add("EMAIL");
            if (phone != null && !phone.isBlank()) {
                channels.add("WHATSAPP");
                channels.add("SMS");
            }

            String subject = "Nuevo partido del equipo " + team.getName();
            String body = String.format(
                    "El grupo %s programó un partido el %s en %s.\n\n" +
                    "Ver ubicación en Google Maps: %s\n\n" +
                    "Para confirmar tu asistencia da clic aquí: %s",
                    team.getName(),
                    formattedDate,
                    match.getAddress(),
                    mapsUrl,
                    confirmUrl
            );

            NotificationSendRequest notification = NotificationSendRequest.builder()
                    .channels(channels)
                    .recipient(email)
                    .recipientPhone(phone)
                    .subject(subject)
                    .body(body)
                    .serviceOrigin("teams-service")
                    .build();

            notificationServiceClient.sendNotification(notification);
        }
    }

    private TeamMatchResponse mapToResponse(TeamMatch match) {
        return TeamMatchResponse.builder()
                .id(match.getId())
                .teamId(match.getTeam().getId())
                .teamName(match.getTeam().getName())
            .address(match.getAddress())
            .latitude(match.getLatitude())
            .longitude(match.getLongitude())
            .placeId(match.getPlaceId())
                .matchDateTime(match.getMatchDateTime())
                .createdAt(match.getCreatedAt())
                .build();
    }

    /**
     * Devuelve todos los partidos de los equipos donde el usuario es miembro aprobado.
     * Publica un evento en RabbitMQ al consultar.
     */
    @Transactional(readOnly = true)
    public List<TeamMatchResponse> getUserMatches(Long userId, String userEmail) {
        // Buscar equipos donde el usuario es miembro aprobado
        List<TeamMember> memberships;
        if (userId != null && userId != 0L) {
            memberships = teamMemberRepository.findApprovedTeamsByUserId(userId);
        } else if (userEmail != null) {
            memberships = teamMemberRepository.findApprovedTeamsByUserEmail(userEmail);
        } else {
            return List.of();
        }

        List<Long> teamIds = memberships.stream()
                .map(m -> m.getTeam().getId())
                .distinct()
                .toList();
        if (teamIds.isEmpty()) {
            return List.of();
        }

        // Buscar partidos de esos equipos
        List<TeamMatch> matches = teamMatchRepository.findByTeamIds(teamIds);
        List<TeamMatchResponse> responses = matches.stream()
                .map(this::mapToResponse)
                .toList();

        // Publicar evento en RabbitMQ
        try {
            rabbitMQService.publishTeamCreated(null); // Puedes personalizar el evento según tu DTO
        } catch (Exception e) {
            log.warn("No se pudo publicar evento en RabbitMQ: {}", e.getMessage());
        }

        return responses;
    }
    // FIN DE LA CLASE
}
