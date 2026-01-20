package com.teamsservice.service;

import com.teamsservice.dto.MatchResultNotificationResponse;
import com.teamsservice.dto.NotificationSendRequest;
import com.teamsservice.dto.UserInfoDto;
import com.teamsservice.entity.Team;
import com.teamsservice.entity.TeamMatch;
import com.teamsservice.entity.TeamMatchPlayerGoalStat;
import com.teamsservice.entity.TeamMatchTeam;
import com.teamsservice.entity.TeamMatchTeamPlayer;
import com.teamsservice.exception.BusinessRuleException;
import com.teamsservice.exception.ResourceNotFoundException;
import com.teamsservice.exception.UnauthorizedException;
import com.teamsservice.repository.TeamMatchPlayerGoalStatRepository;
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
public class TeamMatchResultNotificationService {

    private final TeamMatchRepository teamMatchRepository;
    private final TeamMatchTeamRepository teamMatchTeamRepository;
    private final TeamMatchTeamPlayerRepository teamMatchTeamPlayerRepository;
    private final TeamMatchPlayerGoalStatRepository teamMatchPlayerGoalStatRepository;
    private final AuthServiceClient authServiceClient;
    private final NotificationServiceClient notificationServiceClient;

    @Value("${app.frontend.url:http://localhost:4200}")
    private String frontendUrl;

    @Transactional(readOnly = true)
    public MatchResultNotificationResponse notifyMatchResult(Long teamId, Long matchId, Long currentUserId) {
        TeamMatch match = teamMatchRepository.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("Match not found with id: " + matchId));

        if (!match.getTeam().getId().equals(teamId)) {
            throw new IllegalArgumentException("Match does not belong to this team");
        }

        Team team = match.getTeam();
        if (currentUserId == null || !team.getOwnerUserId().equals(currentUserId)) {
            throw new UnauthorizedException("Only team owner can notify match result");
        }

        if (!match.isFinished()) {
            throw new BusinessRuleException("El partido no está finalizado. Debes guardar el resultado con finished=true antes de notificar.");
        }

        List<TeamMatchTeam> matchTeams = teamMatchTeamRepository.findByMatchIdOrderByIdAsc(matchId);
        if (matchTeams.size() != 2) {
            throw new BusinessRuleException("No se puede notificar el resultado sin 2 equipos del partido");
        }

        TeamMatchTeam teamA = matchTeams.get(0);
        TeamMatchTeam teamB = matchTeams.get(1);

        List<TeamMatchTeamPlayer> assignedPlayers = teamMatchTeamPlayerRepository.findByMatchTeamMatchId(matchId);
        if (assignedPlayers.isEmpty()) {
            throw new BusinessRuleException("No hay jugadores asignados para notificar");
        }

        Map<String, TeamMatchTeamPlayer> assignmentByEmail = assignedPlayers.stream()
                .filter(p -> p.getUserEmail() != null && !p.getUserEmail().isBlank())
                .collect(Collectors.toMap(
                        p -> normalizeEmail(p.getUserEmail()),
                        p -> p,
                        (a, b) -> a
                ));

        List<String> recipients = assignedPlayers.stream()
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

        List<TeamMatchPlayerGoalStat> stats = teamMatchPlayerGoalStatRepository.findByMatchId(matchId);

        int goalsA = 0;
        int goalsB = 0;

        Map<String, Integer> scorers = new HashMap<>();
        Map<String, Integer> ownGoalScorers = new HashMap<>();

        for (TeamMatchPlayerGoalStat s : stats) {
            String emailKey = normalizeEmail(s.getUserEmail());
            TeamMatchTeamPlayer assigned = assignmentByEmail.get(emailKey);
            if (assigned == null) {
                // Should not happen (result service enforces assignment), but avoid breaking notification
                log.warn("No team assignment found for stat email={} matchId={}", emailKey, matchId);
                continue;
            }

            Long playerTeamId = assigned.getMatchTeam().getId();
            Long otherTeamId = Objects.equals(playerTeamId, teamA.getId()) ? teamB.getId() : teamA.getId();

            int goals = Math.max(0, s.getGoals());
            int ownGoals = Math.max(0, s.getOwnGoals());

            if (goals > 0) {
                if (Objects.equals(playerTeamId, teamA.getId())) {
                    goalsA += goals;
                } else {
                    goalsB += goals;
                }
                scorers.merge(emailKey, goals, Integer::sum);
            }

            if (ownGoals > 0) {
                // Own goals add to the opponent score
                if (Objects.equals(otherTeamId, teamA.getId())) {
                    goalsA += ownGoals;
                } else {
                    goalsB += ownGoals;
                }
                ownGoalScorers.merge(emailKey, ownGoals, Integer::sum);
            }
        }

        String subject = buildSubject(team, match, teamA, teamB, goalsA, goalsB);
        Map<String, UserInfoDto> userInfoCache = new HashMap<>();
        String body = buildBody(team, match, teamA, teamB, goalsA, goalsB, scorers, ownGoalScorers, userInfoCache);

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

        return MatchResultNotificationResponse.builder()
                .teamId(teamId)
                .matchId(matchId)
                .recipients(recipients.size())
                .recipientEmails(recipients)
                .subject(subject)
                .build();
    }

    private String buildSubject(Team team, TeamMatch match, TeamMatchTeam a, TeamMatchTeam b, int goalsA, int goalsB) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        String formattedDate = match.getMatchDateTime().format(formatter);
        return String.format(Locale.ROOT,
                "Futbolify | Resultado %s %d-%d %s - %s (%s)",
                a.getName(),
                goalsA,
                goalsB,
                b.getName(),
                team.getName(),
                formattedDate);
    }

    private String buildBody(Team team,
                             TeamMatch match,
                             TeamMatchTeam a,
                             TeamMatchTeam b,
                             int goalsA,
                             int goalsB,
                             Map<String, Integer> scorers,
                             Map<String, Integer> ownGoalScorers,
                             Map<String, UserInfoDto> userInfoCache) {

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        String formattedDate = match.getMatchDateTime().format(formatter);

        String matchUrl = String.format(Locale.ROOT, "%s/equipos/%d/partidos/%d", frontendUrl, team.getId(), match.getId());

        StringBuilder sb = new StringBuilder();
        sb.append("Hola!\n\n");
        sb.append("Resultado final del partido del grupo ").append(team.getName()).append("\n\n");
        sb.append("Fecha y hora: ").append(formattedDate).append("\n");
        if (match.getAddress() != null && !match.getAddress().isBlank()) {
            sb.append("Lugar: ").append(match.getAddress()).append("\n");
        }
        sb.append("Ver en Futbolify: ").append(matchUrl).append("\n\n");

        sb.append("Marcador final:\n");
        sb.append("- ").append(a.getName()).append(" (").append(a.getColor()).append(") ")
                .append(goalsA)
                .append(" - ")
                .append(goalsB)
                .append(" ")
                .append(b.getName()).append(" (").append(b.getColor()).append(")\n");

        String winner;
        if (goalsA > goalsB) {
            winner = a.getName();
        } else if (goalsB > goalsA) {
            winner = b.getName();
        } else {
            winner = "Empate";
        }
        sb.append("Ganador: ").append(winner).append("\n\n");

        sb.append("Goleadores:\n");
        appendScorerLines(sb, scorers, userInfoCache, false);

        if (!ownGoalScorers.isEmpty()) {
            sb.append("\nAutogoles:\n");
            appendScorerLines(sb, ownGoalScorers, userInfoCache, true);
        }

        sb.append("\nFelicitaciones al grupo ").append(team.getName()).append(" por parte de Futbolify.\n");
        return sb.toString();
    }

    private void appendScorerLines(StringBuilder sb,
                                  Map<String, Integer> byEmail,
                                  Map<String, UserInfoDto> userInfoCache,
                                  boolean ownGoals) {
        if (byEmail.isEmpty()) {
            sb.append("(sin ").append(ownGoals ? "autogoles" : "goles").append(")\n");
            return;
        }

        List<Map.Entry<String, Integer>> rows = new ArrayList<>(byEmail.entrySet());
        rows.sort((a, b) -> Integer.compare(b.getValue(), a.getValue()));

        for (Map.Entry<String, Integer> e : rows) {
            String email = e.getKey();
            Integer countBoxed = e.getValue();
            int count = countBoxed == null ? 0 : countBoxed.intValue();
            String displayName = email;
            UserInfoDto info = getUserInfoCached(email, userInfoCache);
            if (info != null) {
                String firstName = info.getFirstName() == null ? "" : info.getFirstName().trim();
                String lastName = info.getLastName() == null ? "" : info.getLastName().trim();
                String fullName = (firstName + " " + lastName).trim();
                if (!fullName.isBlank()) {
                    displayName = fullName;
                }
            }

            sb.append("- ").append(displayName).append(": ").append(count).append(ownGoals ? " autogol(es)" : " gol(es)").append("\n");
        }
    }

    private UserInfoDto getUserInfoCached(String email, Map<String, UserInfoDto> cache) {
        if (email == null) {
            return null;
        }
        String key = normalizeEmail(email);
        if (key == null || key.isBlank()) {
            return null;
        }
        if (cache.containsKey(key)) {
            return cache.get(key);
        }
        UserInfoDto info = authServiceClient.getUserByEmail(email);
        cache.put(key, info);
        return info;
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        String trimmed = email.trim();
        if (trimmed.isBlank()) {
            return null;
        }
        return trimmed.toLowerCase(Locale.ROOT);
    }
}
