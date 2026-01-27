package com.teamsservice.service;

import com.teamsservice.dto.UserInfoDto;
import com.teamsservice.dto.stats.*;
import com.teamsservice.entity.*;
import com.teamsservice.exception.ResourceNotFoundException;
import com.teamsservice.exception.UnauthorizedException;
import com.teamsservice.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TeamStatsService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final TeamMatchRepository teamMatchRepository;
    private final TeamMatchTeamRepository teamMatchTeamRepository;
    private final TeamMatchTeamPlayerRepository teamMatchTeamPlayerRepository;
    private final TeamMatchPlayerGoalStatRepository teamMatchPlayerGoalStatRepository;
    private final AuthServiceClient authServiceClient;

    @Transactional(readOnly = true)
    public List<StatsTeamAccessResponse> getAccessibleTeams(Long userId) {
        if (userId == null) {
            return Collections.emptyList();
        }

        Map<Long, StatsTeamAccessResponse> byTeamId = new LinkedHashMap<>();

        // Owner teams
        for (Team t : teamRepository.findByOwnerUserIdAndStatus(userId, TeamStatus.ACTIVE)) {
            byTeamId.put(t.getId(), StatsTeamAccessResponse.builder()
                    .teamId(t.getId())
                    .teamName(t.getName())
                    .role("OWNER")
                    .build());
        }

        // Membership teams (approved)
        for (TeamMember tm : teamMemberRepository.findApprovedTeamsByUserId(userId)) {
            Team t = tm.getTeam();
            if (t == null || t.getStatus() != TeamStatus.ACTIVE) {
                continue;
            }
            byTeamId.putIfAbsent(t.getId(), StatsTeamAccessResponse.builder()
                    .teamId(t.getId())
                    .teamName(t.getName())
                    .role("MEMBER")
                    .build());
        }

        return new ArrayList<>(byTeamId.values());
    }

    @Transactional(readOnly = true)
    public List<Integer> getFinishedYears(Long teamId, Long currentUserId, String currentUserEmail) {
        Team team = getTeamOrThrow(teamId);
        assertMemberOrOwner(team, teamId, currentUserId, currentUserEmail);
        return teamMatchRepository.findFinishedYears(teamId);
    }

    @Transactional(readOnly = true)
    public List<Integer> getFinishedMonths(Long teamId, int year, Long currentUserId, String currentUserEmail) {
        Team team = getTeamOrThrow(teamId);
        assertMemberOrOwner(team, teamId, currentUserId, currentUserEmail);
        return teamMatchRepository.findFinishedMonths(teamId, year);
    }

    @Transactional(readOnly = true)
    public StatsMatchesPageResponse getFinishedMatchSummaries(Long teamId,
                                                             int year,
                                                             Integer month,
                                                             int page,
                                                             int size,
                                                             Long currentUserId,
                                                             String currentUserEmail) {
        Team team = getTeamOrThrow(teamId);
        assertMemberOrOwner(team, teamId, currentUserId, currentUserEmail);

        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, 50));

        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "matchDateTime"));

        Page<TeamMatch> matches = teamMatchRepository.findFinishedMatches(teamId, year, month, pageable);

        List<StatsMatchSummaryResponse> content = matches.getContent().stream()
                .map(this::buildMatchSummary)
                .collect(Collectors.toList());

        return StatsMatchesPageResponse.builder()
                .content(content)
                .page(matches.getNumber())
                .size(matches.getSize())
                .totalElements(matches.getTotalElements())
                .totalPages(matches.getTotalPages())
                .last(matches.isLast())
                .build();
    }

    @Transactional(readOnly = true)
    public List<StatsTopScorerResponse> getTopScorers(Long teamId,
                                                     int year,
                                                     Integer month,
                                                     int limit,
                                                     Long currentUserId,
                                                     String currentUserEmail) {
        Team team = getTeamOrThrow(teamId);
        assertMemberOrOwner(team, teamId, currentUserId, currentUserEmail);

        int safeLimit = Math.max(1, Math.min(limit, 200));

        Map<String, UserInfoDto> userInfoCache = new HashMap<>();

        return teamMatchPlayerGoalStatRepository.aggregateByTeamFinishedInPeriod(teamId, year, month).stream()
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

                    return StatsTopScorerResponse.builder()
                            .userEmail(row.getUserEmail())
                            .userId(row.getUserId())
                            .goals((int) row.getTotalGoals())
                            .ownGoals((int) row.getTotalOwnGoals())
                            .userInfo(userInfo)
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<StatsWinnerRowResponse> getMatchTeamWinnersLeaderboard(Long teamId,
                                                                      int year,
                                                                      Integer month,
                                                                      Long currentUserId,
                                                                      String currentUserEmail) {
        Team team = getTeamOrThrow(teamId);
        assertMemberOrOwner(team, teamId, currentUserId, currentUserEmail);

        // Load all matches for the period (bounded). If you need more, paginate and aggregate in frontend.
        List<TeamMatch> matches = teamMatchRepository.findFinishedMatches(teamId, year, month);

        Map<String, Long> winsByKey = new HashMap<>();
        Map<String, StatsMatchTeamScoreResponse> teamByKey = new HashMap<>();

        for (TeamMatch match : matches) {
            StatsMatchSummaryResponse summary = buildMatchSummary(match);
            Long winnerId = summary.getWinnerMatchTeamId();
            if (winnerId == null) {
                continue;
            }

            StatsMatchTeamScoreResponse winner = null;
            if (summary.getTeamA() != null && winnerId.equals(summary.getTeamA().getMatchTeamId())) {
                winner = summary.getTeamA();
            } else if (summary.getTeamB() != null && winnerId.equals(summary.getTeamB().getMatchTeamId())) {
                winner = summary.getTeamB();
            }

            if (winner == null) {
                continue;
            }

            String key = normalizeKey(winner.getName(), winner.getColor());
            winsByKey.put(key, winsByKey.getOrDefault(key, 0L) + 1L);
            teamByKey.putIfAbsent(key, winner);
        }

        return winsByKey.entrySet().stream()
                .map(e -> {
                    StatsMatchTeamScoreResponse t = teamByKey.get(e.getKey());
                    return StatsWinnerRowResponse.builder()
                            .name(t == null ? null : t.getName())
                            .color(t == null ? null : t.getColor())
                            .wins(e.getValue())
                            .build();
                })
                .sorted(Comparator.comparingLong(StatsWinnerRowResponse::getWins).reversed())
                .collect(Collectors.toList());
    }

    private StatsMatchSummaryResponse buildMatchSummary(TeamMatch match) {
        List<TeamMatchTeam> teams = teamMatchTeamRepository.findByMatchIdOrderByIdAsc(match.getId());
        StatsMatchTeamScoreResponse teamA = teams.size() > 0 ? StatsMatchTeamScoreResponse.builder()
                .matchTeamId(teams.get(0).getId())
                .name(teams.get(0).getName())
                .color(teams.get(0).getColor())
                .goals(0)
                .build() : null;

        StatsMatchTeamScoreResponse teamB = teams.size() > 1 ? StatsMatchTeamScoreResponse.builder()
                .matchTeamId(teams.get(1).getId())
                .name(teams.get(1).getName())
                .color(teams.get(1).getColor())
                .goals(0)
                .build() : null;

        Long winnerId = null;

        if (teamA != null && teamB != null) {
            Map<String, Long> playerTeamByEmail = teamMatchTeamPlayerRepository.findByMatchTeamMatchId(match.getId())
                    .stream()
                    .collect(Collectors.toMap(
                            p -> normalizeEmail(p.getUserEmail()),
                            p -> p.getMatchTeam().getId(),
                            (a, b) -> b
                    ));

            int goalsAPlayers = 0;
            int goalsBPlayers = 0;
            int ownGoalsA = 0;
            int ownGoalsB = 0;

            for (TeamMatchPlayerGoalStat s : teamMatchPlayerGoalStatRepository.findByMatchId(match.getId())) {
                Long matchTeamId = playerTeamByEmail.get(normalizeEmail(s.getUserEmail()));
                if (matchTeamId == null) {
                    continue;
                }

                if (matchTeamId.equals(teamA.getMatchTeamId())) {
                    goalsAPlayers += s.getGoals();
                    ownGoalsA += s.getOwnGoals();
                } else if (matchTeamId.equals(teamB.getMatchTeamId())) {
                    goalsBPlayers += s.getGoals();
                    ownGoalsB += s.getOwnGoals();
                }
            }

            int goalsA = goalsAPlayers + ownGoalsB;
            int goalsB = goalsBPlayers + ownGoalsA;

            teamA.setGoals(goalsA);
            teamB.setGoals(goalsB);

            if (goalsA > goalsB) {
                winnerId = teamA.getMatchTeamId();
            } else if (goalsB > goalsA) {
                winnerId = teamB.getMatchTeamId();
            }
        }

        return StatsMatchSummaryResponse.builder()
                .matchId(match.getId())
                .matchDateTime(match.getMatchDateTime())
                .matchAddress(match.getAddress())
                .teamA(teamA)
                .teamB(teamB)
                .winnerMatchTeamId(winnerId)
                .build();
    }

    private Team getTeamOrThrow(Long teamId) {
        return teamRepository.findByIdAndStatus(teamId, TeamStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found with id: " + teamId));
    }

    private void assertMemberOrOwner(Team team, Long teamId, Long currentUserId, String currentUserEmail) {
        if (currentUserId != null && team.getOwnerUserId().equals(currentUserId)) {
            return;
        }
        // Allow access only to the owner or to APPROVED members
        boolean isApproved = false;

        if (currentUserId != null && currentUserId != 0) {
            isApproved = teamMemberRepository.findByTeamIdAndUserId(teamId, currentUserId)
                    .map(tm -> tm.getStatus() == TeamMember.MembershipStatus.APPROVED)
                    .orElse(false);
        }

        if (!isApproved && currentUserEmail != null && !currentUserEmail.isBlank()) {
            isApproved = teamMemberRepository.existsByTeamIdAndUserEmailAndStatus(
                    teamId, normalizeEmail(currentUserEmail), TeamMember.MembershipStatus.APPROVED);
        }

        if (!isApproved) {
            throw new UnauthorizedException("You are not an approved member of this team");
        }
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeKey(String name, String color) {
        String n = name == null ? "" : name.trim().toLowerCase(Locale.ROOT);
        String c = color == null ? "" : color.trim().toLowerCase(Locale.ROOT);
        return n + "|" + c;
    }
}
