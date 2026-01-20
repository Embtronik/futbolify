package com.teamsservice.service;

import com.teamsservice.dto.MatchTeamPlayerResponse;
import com.teamsservice.dto.MatchTeamPlayerUpsertRequest;
import com.teamsservice.dto.TeamMatchTeamCreateRequest;
import com.teamsservice.dto.TeamMatchTeamResponse;
import com.teamsservice.dto.UserInfoDto;
import com.teamsservice.entity.Team;
import com.teamsservice.entity.TeamMatch;
import com.teamsservice.entity.TeamMatchAttendance;
import com.teamsservice.entity.TeamMatchTeam;
import com.teamsservice.entity.TeamMatchTeamPlayer;
import com.teamsservice.entity.TeamMember;
import com.teamsservice.exception.ResourceNotFoundException;
import com.teamsservice.exception.UnauthorizedException;
import com.teamsservice.repository.TeamMatchAttendanceRepository;
import com.teamsservice.repository.TeamMatchRepository;
import com.teamsservice.repository.TeamMatchTeamPlayerRepository;
import com.teamsservice.repository.TeamMatchTeamRepository;
import com.teamsservice.repository.TeamMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TeamMatchTeamService {

    private final TeamMatchRepository teamMatchRepository;
    private final TeamMatchAttendanceRepository teamMatchAttendanceRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final TeamMatchTeamRepository teamMatchTeamRepository;
    private final TeamMatchTeamPlayerRepository teamMatchTeamPlayerRepository;
    private final AuthServiceClient authServiceClient;

    @Transactional
    public TeamMatchTeamResponse createMatchTeam(Long teamId, Long matchId, TeamMatchTeamCreateRequest request, Long currentUserId) {
        TeamMatch match = getMatchOrThrow(teamId, matchId);
        assertOwner(match.getTeam(), currentUserId);

        TeamMatchTeam team = TeamMatchTeam.builder()
                .match(match)
                .name(request.getName().trim())
                .color(request.getColor().trim())
                .build();

        team = teamMatchTeamRepository.save(team);
        return mapToResponse(team, Collections.emptyList());
    }

    @Transactional(readOnly = true)
    public List<TeamMatchTeamResponse> listMatchTeams(Long teamId, Long matchId, Long currentUserId) {
        TeamMatch match = getMatchOrThrow(teamId, matchId);
        assertOwner(match.getTeam(), currentUserId);

        List<TeamMatchTeam> teams = teamMatchTeamRepository.findByMatchIdOrderByIdAsc(matchId);
        if (teams.isEmpty()) {
            return Collections.emptyList();
        }

        List<TeamMatchTeamPlayer> allPlayers = teamMatchTeamPlayerRepository.findByMatchTeamMatchId(matchId);
        Map<Long, List<TeamMatchTeamPlayer>> playersByTeamId = allPlayers.stream()
                .collect(Collectors.groupingBy(p -> p.getMatchTeam().getId()));

        return teams.stream()
                .map(team -> mapToResponse(team, playersByTeamId.getOrDefault(team.getId(), Collections.emptyList())))
                .collect(Collectors.toList());
    }

    @Transactional
    public List<TeamMatchTeamResponse> bulkCreateMatchTeams(Long teamId, Long matchId, List<TeamMatchTeamCreateRequest> teams, Long currentUserId) {
        TeamMatch match = getMatchOrThrow(teamId, matchId);
        assertOwner(match.getTeam(), currentUserId);

        List<TeamMatchTeamResponse> created = new ArrayList<>();
        for (TeamMatchTeamCreateRequest req : teams) {
            created.add(createMatchTeam(teamId, matchId, req, currentUserId));
        }
        return created;
    }

    @Transactional
    public TeamMatchTeamResponse updateMatchTeam(Long teamId, Long matchId, Long matchTeamId, TeamMatchTeamCreateRequest request, Long currentUserId) {
        TeamMatch match = getMatchOrThrow(teamId, matchId);
        assertOwner(match.getTeam(), currentUserId);

        TeamMatchTeam team = teamMatchTeamRepository.findById(matchTeamId)
                .orElseThrow(() -> new ResourceNotFoundException("Match team not found with id: " + matchTeamId));

        if (!team.getMatch().getId().equals(matchId)) {
            throw new IllegalArgumentException("Match team does not belong to this match");
        }

        team.setName(request.getName().trim());
        team.setColor(request.getColor().trim());
        team = teamMatchTeamRepository.save(team);

        List<TeamMatchTeamPlayer> players = teamMatchTeamPlayerRepository.findByMatchTeamIdOrderByIdAsc(matchTeamId);
        return mapToResponse(team, players);
    }

    @Transactional
    public void deleteMatchTeam(Long teamId, Long matchId, Long matchTeamId, Long currentUserId) {
        TeamMatch match = getMatchOrThrow(teamId, matchId);
        assertOwner(match.getTeam(), currentUserId);

        TeamMatchTeam team = teamMatchTeamRepository.findById(matchTeamId)
                .orElseThrow(() -> new ResourceNotFoundException("Match team not found with id: " + matchTeamId));

        if (!team.getMatch().getId().equals(matchId)) {
            throw new IllegalArgumentException("Match team does not belong to this match");
        }

        // Delete players first to avoid FK issues
        List<TeamMatchTeamPlayer> players = teamMatchTeamPlayerRepository.findByMatchTeamIdOrderByIdAsc(matchTeamId);
        teamMatchTeamPlayerRepository.deleteAll(players);
        teamMatchTeamRepository.delete(team);
    }

    @Transactional
    public TeamMatchTeamResponse upsertPlayer(Long teamId,
                                             Long matchId,
                                             Long matchTeamId,
                                             Long targetUserId,
                                             MatchTeamPlayerUpsertRequest request,
                                             Long currentUserId) {
        TeamMatch match = getMatchOrThrow(teamId, matchId);
        assertOwner(match.getTeam(), currentUserId);

        TeamMatchTeam team = teamMatchTeamRepository.findById(matchTeamId)
                .orElseThrow(() -> new ResourceNotFoundException("Match team not found with id: " + matchTeamId));

        if (!team.getMatch().getId().equals(matchId)) {
            throw new IllegalArgumentException("Match team does not belong to this match");
        }

        // Only allow assigning ATTENDING players
        boolean attending = teamMatchAttendanceRepository.findByMatchIdAndUserId(matchId, targetUserId)
                .map(a -> a.getStatus() == TeamMatchAttendance.AttendanceStatus.ATTENDING)
                .orElse(false);

        if (!attending) {
            throw new IllegalArgumentException("Only ATTENDING players can be assigned to match teams");
        }

        TeamMember member = teamMemberRepository.findByTeamIdAndUserId(teamId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Team member not found with userId: " + targetUserId));

        if (member.getStatus() != TeamMember.MembershipStatus.APPROVED) {
            throw new UnauthorizedException("Target user is not an approved member of this team");
        }

        TeamMatchTeamPlayer.PlayerPosition position = parsePosition(request.getPosition());

        // If user is already in this same team, just update (prevents unique constraint violation)
        Optional<TeamMatchTeamPlayer> existingInSameTeam = teamMatchTeamPlayerRepository
            .findByMatchTeamIdAndUserId(matchTeamId, targetUserId);

        if (existingInSameTeam.isPresent()) {
            TeamMatchTeamPlayer existing = existingInSameTeam.get();
            existing.setPosition(position);
            if (member.getUserEmail() != null && !member.getUserEmail().isBlank()) {
            existing.setUserEmail(member.getUserEmail());
            }
            teamMatchTeamPlayerRepository.save(existing);
        } else {
            // If user is already assigned to another team in this match, remove it (move behavior)
            teamMatchTeamPlayerRepository.findByMatchTeamMatchIdAndUserId(matchId, targetUserId)
                .ifPresent(teamMatchTeamPlayerRepository::delete);
            // Ensure delete is executed before insert within same transaction
            teamMatchTeamPlayerRepository.flush();

            TeamMatchTeamPlayer player = TeamMatchTeamPlayer.builder()
                .matchTeam(team)
                .userId(targetUserId)
                .userEmail(member.getUserEmail())
                .position(position)
                .build();

            teamMatchTeamPlayerRepository.save(player);
        }

        List<TeamMatchTeamPlayer> players = teamMatchTeamPlayerRepository.findByMatchTeamIdOrderByIdAsc(matchTeamId);
        return mapToResponse(team, players);
    }

    @Transactional
    public TeamMatchTeamResponse removePlayer(Long teamId,
                                              Long matchId,
                                              Long matchTeamId,
                                              Long targetUserId,
                                              Long currentUserId) {
        TeamMatch match = getMatchOrThrow(teamId, matchId);
        assertOwner(match.getTeam(), currentUserId);

        TeamMatchTeam team = teamMatchTeamRepository.findById(matchTeamId)
                .orElseThrow(() -> new ResourceNotFoundException("Match team not found with id: " + matchTeamId));

        if (!team.getMatch().getId().equals(matchId)) {
            throw new IllegalArgumentException("Match team does not belong to this match");
        }

        teamMatchTeamPlayerRepository.findByMatchTeamIdAndUserId(matchTeamId, targetUserId)
                .ifPresent(teamMatchTeamPlayerRepository::delete);

        List<TeamMatchTeamPlayer> players = teamMatchTeamPlayerRepository.findByMatchTeamIdOrderByIdAsc(matchTeamId);
        return mapToResponse(team, players);
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
        if (!team.getOwnerUserId().equals(currentUserId)) {
            throw new UnauthorizedException("Only team owner can manage match teams");
        }
    }

    private TeamMatchTeamPlayer.PlayerPosition parsePosition(String position) {
        if (position == null) {
            throw new IllegalArgumentException("Position is required");
        }

        String normalized = position.trim().toUpperCase(Locale.ROOT);
        try {
            return TeamMatchTeamPlayer.PlayerPosition.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid position. Allowed: GOALKEEPER, DEFENDER, MIDFIELDER, FORWARD");
        }
    }

    private TeamMatchTeamResponse mapToResponse(TeamMatchTeam team, List<TeamMatchTeamPlayer> players) {
        List<MatchTeamPlayerResponse> playerResponses = players.stream().map(p -> {
            UserInfoDto userInfo = null;
            try {
                if (p.getUserEmail() != null) {
                    userInfo = authServiceClient.getUserByEmail(p.getUserEmail());
                }
            } catch (Exception e) {
                log.warn("Could not fetch user info for email {}: {}", p.getUserEmail(), e.getMessage());
            }

            return MatchTeamPlayerResponse.builder()
                    .userId(p.getUserId())
                    .userEmail(p.getUserEmail())
                    .position(p.getPosition().name())
                    .userInfo(userInfo)
                    .build();
        }).collect(Collectors.toList());

        return TeamMatchTeamResponse.builder()
                .id(team.getId())
                .matchId(team.getMatch().getId())
                .name(team.getName())
                .color(team.getColor())
                .createdAt(team.getCreatedAt())
                .players(playerResponses)
                .build();
    }
}
