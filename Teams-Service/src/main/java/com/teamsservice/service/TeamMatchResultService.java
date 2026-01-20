package com.teamsservice.service;

import com.teamsservice.dto.MatchPlayerGoalsUpsertRequest;
import com.teamsservice.dto.MatchPlayerStatResponse;
import com.teamsservice.dto.MatchResultResponse;
import com.teamsservice.dto.MatchResultUpsertRequest;
import com.teamsservice.dto.MatchTeamScoreResponse;
import com.teamsservice.dto.PlayerHistoricalStatsResponse;
import com.teamsservice.dto.UserInfoDto;
import com.teamsservice.entity.Team;
import com.teamsservice.entity.TeamMatch;
import com.teamsservice.entity.TeamMatchPlayerGoalStat;
import com.teamsservice.entity.TeamMatchTeam;
import com.teamsservice.entity.TeamMatchTeamPlayer;
import com.teamsservice.entity.TeamMember;
import com.teamsservice.entity.TeamStatus;
import com.teamsservice.exception.ResourceNotFoundException;
import com.teamsservice.exception.UnauthorizedException;
import com.teamsservice.repository.TeamMatchPlayerGoalStatRepository;
import com.teamsservice.repository.TeamMatchRepository;
import com.teamsservice.repository.TeamMatchTeamPlayerRepository;
import com.teamsservice.repository.TeamMatchTeamRepository;
import com.teamsservice.repository.TeamMemberRepository;
import com.teamsservice.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TeamMatchResultService {

    private final TeamMatchRepository teamMatchRepository;
    private final TeamMatchTeamRepository teamMatchTeamRepository;
    private final TeamMatchTeamPlayerRepository teamMatchTeamPlayerRepository;
    private final TeamMatchPlayerGoalStatRepository teamMatchPlayerGoalStatRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final TeamRepository teamRepository;
    private final AuthServiceClient authServiceClient;

    @Transactional
    public MatchResultResponse upsertMatchResult(Long teamId,
                                                Long matchId,
                                                MatchResultUpsertRequest request,
                                                Long currentUserId) {

        TeamMatch match = getMatchOrThrow(teamId, matchId);
        assertOwner(match.getTeam(), currentUserId);

        List<TeamMatchTeam> teams = teamMatchTeamRepository.findByMatchIdOrderByIdAsc(matchId);
        if (teams.size() != 2) {
            throw new IllegalArgumentException("Result requires exactly 2 match teams");
        }

        List<MatchPlayerGoalsUpsertRequest> players = request.getPlayers() == null
                ? Collections.emptyList()
                : request.getPlayers();

        // Replace strategy: wipe existing stats and insert the provided ones.
        // Important: payload can contain duplicates for the same (match_id, user_email),
        // so dedupe by normalized email to keep this endpoint idempotent.
        Map<String, MatchPlayerGoalsUpsertRequest> byEmail = new LinkedHashMap<>();
        for (MatchPlayerGoalsUpsertRequest p : players) {
            String email = normalizeEmail(p.getUserEmail());
            if (email == null || email.isBlank()) {
                throw new IllegalArgumentException("userEmail is required for each player stat");
            }

            int goals = Math.max(0, p.getGoals());
            int ownGoals = Math.max(0, p.getOwnGoals());

            if (goals == 0 && ownGoals == 0) {
                continue;
            }

            MatchPlayerGoalsUpsertRequest prev = byEmail.put(email, p);
            if (prev != null) {
                log.warn("Duplicate player stat in request for matchId={} email={}; keeping last value", matchId, email);
            }
        }

        teamMatchPlayerGoalStatRepository.deleteByMatchId(matchId);
        teamMatchPlayerGoalStatRepository.flush();

        for (MatchPlayerGoalsUpsertRequest p : byEmail.values()) {
            String email = normalizeEmail(p.getUserEmail());
            int goals = Math.max(0, p.getGoals());
            int ownGoals = Math.max(0, p.getOwnGoals());

            // Ensure player is assigned to a match team (so we can compute team scores)
            resolveAssignedPlayer(matchId, p.getUserId(), email);

            TeamMatchPlayerGoalStat stat = TeamMatchPlayerGoalStat.builder()
                    .match(match)
                    .userId(p.getUserId())
                    .userEmail(email)
                    .goals(goals)
                    .ownGoals(ownGoals)
                    .build();

            teamMatchPlayerGoalStatRepository.save(stat);
        }

        LocalDateTime now = LocalDateTime.now();
        match.setFinished(Boolean.TRUE.equals(request.getFinished()));
        match.setResultUpdatedAt(now);
        if (match.isFinished()) {
            if (match.getFinishedAt() == null) {
                match.setFinishedAt(now);
            }
        } else {
            match.setFinishedAt(null);
        }

        teamMatchRepository.save(match);

        return buildMatchResultResponse(teamId, match, teams);
    }

    @Transactional(readOnly = true)
    public MatchResultResponse getMatchResult(Long teamId,
                                              Long matchId,
                                              Long currentUserId,
                                              String currentUserEmail) {

        TeamMatch match = getMatchOrThrow(teamId, matchId);
        assertMemberOrOwner(match.getTeam(), teamId, currentUserId, currentUserEmail);

        List<TeamMatchTeam> teams = teamMatchTeamRepository.findByMatchIdOrderByIdAsc(matchId);
        return buildMatchResultResponse(teamId, match, teams);
    }

    @Transactional(readOnly = true)
    public List<PlayerHistoricalStatsResponse> getTeamPlayerHistoricalStats(Long teamId,
                                                                            Long currentUserId,
                                                                            String currentUserEmail,
                                                                            int limit) {
        Team team = teamRepository.findByIdAndStatus(teamId, TeamStatus.ACTIVE)
            .orElseThrow(() -> new ResourceNotFoundException("Team not found with id: " + teamId));
        assertMemberOrOwner(team, teamId, currentUserId, currentUserEmail);

        int safeLimit = Math.max(1, Math.min(limit, 200));

        Map<String, UserInfoDto> userInfoCache = new HashMap<>();

        return teamMatchPlayerGoalStatRepository.aggregateByTeamFinished(teamId).stream()
                .sorted(Comparator.comparingLong(TeamMatchPlayerGoalStatRepository.PlayerAggRow::getTotalGoals)
                        .reversed()
                        .thenComparingLong(TeamMatchPlayerGoalStatRepository.PlayerAggRow::getTotalOwnGoals))
                .limit(safeLimit)
                .map(row -> {
                    UserInfoDto userInfo = null;
                    try {
                        if (row.getUserEmail() != null) {
                            userInfo = userInfoCache.computeIfAbsent(row.getUserEmail(), authServiceClient::getUserByEmail);
                        }
                    } catch (Exception e) {
                        log.warn("Could not fetch user info for email {}: {}", row.getUserEmail(), e.getMessage());
                    }

                    return PlayerHistoricalStatsResponse.builder()
                            .userEmail(row.getUserEmail())
                            .userId(row.getUserId())
                            .totalGoals((int) row.getTotalGoals())
                            .totalOwnGoals((int) row.getTotalOwnGoals())
                            .matchesFinished((int) row.getMatchesFinished())
                            .userInfo(userInfo)
                            .build();
                })
                .collect(Collectors.toList());
    }

    private MatchResultResponse buildMatchResultResponse(Long teamId,
                                                         TeamMatch match,
                                                         List<TeamMatchTeam> teams) {

        Map<String, TeamMatchPlayerGoalStat> statByEmailLower = teamMatchPlayerGoalStatRepository.findByMatchId(match.getId())
                .stream()
                .collect(Collectors.toMap(s -> normalizeEmail(s.getUserEmail()).toLowerCase(Locale.ROOT), s -> s, (a, b) -> b));

        List<TeamMatchTeamPlayer> assignedPlayers = teamMatchTeamPlayerRepository.findByMatchTeamMatchId(match.getId());

        Map<Long, List<TeamMatchTeamPlayer>> assignedByMatchTeamId = assignedPlayers.stream()
                .collect(Collectors.groupingBy(p -> p.getMatchTeam().getId()));

        Map<String, UserInfoDto> userInfoCache = new HashMap<>();

        // Build per-team player stats
        List<MatchTeamScoreResponse> teamResponses = teams.stream().map(t -> {
            List<TeamMatchTeamPlayer> teamPlayers = assignedByMatchTeamId.getOrDefault(t.getId(), Collections.emptyList());

            List<MatchPlayerStatResponse> players = teamPlayers.stream().map(tp -> {
                String email = normalizeEmail(tp.getUserEmail());
                TeamMatchPlayerGoalStat stat = statByEmailLower.get(email.toLowerCase(Locale.ROOT));

                int goals = stat == null ? 0 : stat.getGoals();
                int ownGoals = stat == null ? 0 : stat.getOwnGoals();

                UserInfoDto userInfo = null;
                try {
                    if (email != null) {
                        userInfo = userInfoCache.computeIfAbsent(email, authServiceClient::getUserByEmail);
                    }
                } catch (Exception e) {
                    log.warn("Could not fetch user info for email {}: {}", email, e.getMessage());
                }

                return MatchPlayerStatResponse.builder()
                        .userId(tp.getUserId())
                        .userEmail(email)
                        .goals(goals)
                        .ownGoals(ownGoals)
                        .position(tp.getPosition() == null ? null : tp.getPosition().name())
                        .userInfo(userInfo)
                        .build();
            }).collect(Collectors.toList());

            return MatchTeamScoreResponse.builder()
                    .matchTeamId(t.getId())
                    .name(t.getName())
                    .color(t.getColor())
                    .goals(0) // computed below
                    .players(players)
                    .build();
        }).collect(Collectors.toList());

        // Compute final score (only meaningful with exactly 2 teams)
        if (teamResponses.size() == 2) {
            MatchTeamScoreResponse a = teamResponses.get(0);
            MatchTeamScoreResponse b = teamResponses.get(1);

            int goalsA = sumGoals(a.getPlayers()) + sumOwnGoals(b.getPlayers());
            int goalsB = sumGoals(b.getPlayers()) + sumOwnGoals(a.getPlayers());

            a.setGoals(goalsA);
            b.setGoals(goalsB);
        } else {
            // Fallback: just sum goals inside each team
            for (MatchTeamScoreResponse tr : teamResponses) {
                tr.setGoals(sumGoals(tr.getPlayers()));
            }
        }

        return MatchResultResponse.builder()
                .teamId(teamId)
                .matchId(match.getId())
                .finished(match.isFinished())
                .finishedAt(match.getFinishedAt())
                .resultUpdatedAt(match.getResultUpdatedAt())
                .matchAddress(match.getAddress())
                .matchDateTime(match.getMatchDateTime())
                .teams(teamResponses)
                .build();
    }

    private int sumGoals(List<MatchPlayerStatResponse> players) {
        return players == null ? 0 : players.stream().mapToInt(MatchPlayerStatResponse::getGoals).sum();
    }

    private int sumOwnGoals(List<MatchPlayerStatResponse> players) {
        return players == null ? 0 : players.stream().mapToInt(MatchPlayerStatResponse::getOwnGoals).sum();
    }

    private TeamMatch getMatchOrThrow(Long teamId, Long matchId) {
        TeamMatch match = teamMatchRepository.findById(matchId)
                .orElseThrow(() -> new ResourceNotFoundException("Match not found with id: " + matchId));

        if (!match.getTeam().getId().equals(teamId)) {
            throw new IllegalArgumentException("Match does not belong to this team");
        }

        return match;
    }

    private void assertOwner(Team team, Long currentUserId) {
        if (currentUserId == null || !team.getOwnerUserId().equals(currentUserId)) {
            throw new UnauthorizedException("Only team owner can manage match results");
        }
    }

    private void assertMemberOrOwner(Team team, Long teamId, Long currentUserId, String currentUserEmail) {
        if (currentUserId != null && team.getOwnerUserId().equals(currentUserId)) {
            return;
        }

        boolean isApprovedMember = false;
        if (currentUserId != null && currentUserId != 0) {
            isApprovedMember = teamMemberRepository.findByTeamIdAndUserId(teamId, currentUserId)
                    .map(m -> m.getStatus() == TeamMember.MembershipStatus.APPROVED)
                    .orElse(false);
        }

        if (!isApprovedMember && currentUserEmail != null && !currentUserEmail.isBlank()) {
            isApprovedMember = teamMemberRepository.existsByTeamIdAndUserEmailAndStatus(
                    teamId,
                    currentUserEmail,
                    TeamMember.MembershipStatus.APPROVED);
        }

        if (!isApprovedMember) {
            throw new UnauthorizedException("You are not a member of this team");
        }
    }

    private TeamMatchTeamPlayer resolveAssignedPlayer(Long matchId, Long userId, String userEmail) {
        if (userEmail != null && !userEmail.isBlank()) {
            Optional<TeamMatchTeamPlayer> byEmail = teamMatchTeamPlayerRepository
                    .findByMatchTeamMatchIdAndUserEmailIgnoreCase(matchId, userEmail);
            if (byEmail.isPresent()) {
                return byEmail.get();
            }
        }

        if (userId != null) {
            Optional<TeamMatchTeamPlayer> byUserId = teamMatchTeamPlayerRepository
                    .findByMatchTeamMatchIdAndUserId(matchId, userId);
            if (byUserId.isPresent()) {
                return byUserId.get();
            }
        }

        throw new IllegalArgumentException("Player must be assigned to a match team to set goals/own-goals");
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}
