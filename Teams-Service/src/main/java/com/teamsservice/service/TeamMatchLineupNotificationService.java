package com.teamsservice.service;

import com.teamsservice.dto.MatchTeamsNotificationResponse;
import com.teamsservice.dto.NotificationSendRequest;
import com.teamsservice.dto.UserInfoDto;
import com.teamsservice.entity.Team;
import com.teamsservice.entity.TeamMatch;
import com.teamsservice.entity.TeamMatchTeam;
import com.teamsservice.entity.TeamMatchTeamPlayer;
import com.teamsservice.exception.BusinessRuleException;
import com.teamsservice.exception.ResourceNotFoundException;
import com.teamsservice.exception.UnauthorizedException;
import com.teamsservice.repository.TeamMatchRepository;
import com.teamsservice.repository.TeamMatchTeamPlayerRepository;
import com.teamsservice.repository.TeamMatchTeamRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TeamMatchLineupNotificationService {

    private final TeamMatchRepository teamMatchRepository;
    private final TeamMatchTeamRepository teamMatchTeamRepository;
    private final TeamMatchTeamPlayerRepository teamMatchTeamPlayerRepository;
    private final AuthServiceClient authServiceClient;
    private final NotificationServiceClient notificationServiceClient;

    @Value("${app.frontend.url:http://localhost:4200}")
    private String frontendUrl;

    @Transactional(readOnly = true)
    public MatchTeamsNotificationResponse notifyMatchTeams(Long teamId, Long matchId, Long currentUserId) {
        TeamMatch match = teamMatchRepository.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("Match not found with id: " + matchId));

        if (!match.getTeam().getId().equals(teamId)) {
            throw new IllegalArgumentException("Match does not belong to this team");
        }

        Team team = match.getTeam();
        if (!team.getOwnerUserId().equals(currentUserId)) {
            throw new UnauthorizedException("Only team owner can notify match teams");
        }

        List<TeamMatchTeam> teams = teamMatchTeamRepository.findByMatchIdOrderByIdAsc(matchId);
        if (teams.isEmpty()) {
            throw new BusinessRuleException("No hay equipos creados para este partido");
        }

        List<TeamMatchTeamPlayer> players = teamMatchTeamPlayerRepository.findByMatchTeamMatchId(matchId);
        if (players.isEmpty()) {
            throw new BusinessRuleException("No hay jugadores asignados a los equipos de este partido");
        }

        Map<Long, List<TeamMatchTeamPlayer>> playersByTeamId = players.stream()
                .collect(Collectors.groupingBy(p -> p.getMatchTeam().getId()));

        // Recipients = unique emails of assigned players
        List<String> recipients = players.stream()
                .map(TeamMatchTeamPlayer::getUserEmail)
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .distinct()
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .collect(Collectors.toList());

        if (recipients.isEmpty()) {
            throw new BusinessRuleException("No se encontraron correos de jugadores para notificar");
        }

        String subject = buildSubject(team, match);
        Map<String, UserInfoDto> userInfoCache = new HashMap<>();
        String body = buildBody(team, match, teams, playersByTeamId, userInfoCache);

        for (String email : recipients) {
            UserInfoDto userInfo = getUserInfoCached(email, userInfoCache);

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

        return MatchTeamsNotificationResponse.builder()
                .teamId(teamId)
                .matchId(matchId)
                .recipients(recipients.size())
                .recipientEmails(recipients)
                .subject(subject)
                .build();
    }

    private String buildSubject(Team team, TeamMatch match) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        String formattedDate = match.getMatchDateTime().format(formatter);
        return "Futbolify | Equipos confirmados - " + team.getName() + " (" + formattedDate + ")";
    }

    private String buildBody(Team team,
                             TeamMatch match,
                             List<TeamMatchTeam> teams,
                             Map<Long, List<TeamMatchTeamPlayer>> playersByTeamId,
                             Map<String, UserInfoDto> userInfoCache) {

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        String formattedDate = match.getMatchDateTime().format(formatter);

        String mapsUrl;
        if (match.getLatitude() != null && match.getLongitude() != null && match.getPlaceId() != null) {
            mapsUrl = String.format(
                    Locale.ROOT,
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

        String matchUrl = String.format("%s/equipos/%d/partidos/%d", frontendUrl, team.getId(), match.getId());

        StringBuilder sb = new StringBuilder();
        sb.append("Hola!\n\n");
        sb.append("El partido del equipo ").append(team.getName()).append(" ya tiene equipos armados.\n\n");
        sb.append("Fecha y hora: ").append(formattedDate).append("\n");
        if (match.getAddress() != null && !match.getAddress().isBlank()) {
            sb.append("Lugar: ").append(match.getAddress()).append("\n");
        }
        sb.append("Mapa: ").append(mapsUrl).append("\n");
        sb.append("Ver en Futbolify: ").append(matchUrl).append("\n\n");

        sb.append("Equipos:\n");
        for (TeamMatchTeam t : teams) {
            sb.append("\n- ").append(t.getName()).append(" (").append(t.getColor()).append(")\n");

            List<TeamMatchTeamPlayer> teamPlayers = playersByTeamId.getOrDefault(t.getId(), Collections.emptyList());
            if (teamPlayers.isEmpty()) {
                sb.append("  (sin jugadores asignados)\n");
                continue;
            }

            for (TeamMatchTeamPlayer p : teamPlayers) {
                String displayName = p.getUserEmail();
                UserInfoDto info = getUserInfoCached(p.getUserEmail(), userInfoCache);
                if (info != null && info.getFirstName() != null && info.getLastName() != null) {
                    String fullName = (info.getFirstName() + " " + info.getLastName()).trim();
                    if (!fullName.isBlank()) {
                        displayName = fullName;
                    }
                }
                sb.append("  • ").append(displayName).append(" - ").append(p.getPosition().name()).append("\n");
            }
        }

        sb.append("\nFutbolify les desea un buen partido.");
        return sb.toString();
    }

    private UserInfoDto getUserInfoCached(String email, Map<String, UserInfoDto> cache) {
        if (email == null) {
            return null;
        }
        String key = email.trim().toLowerCase(Locale.ROOT);
        if (key.isBlank()) {
            return null;
        }
        if (cache.containsKey(key)) {
            return cache.get(key);
        }
        UserInfoDto info = authServiceClient.getUserByEmail(email);
        cache.put(key, info);
        return info;
    }
}
