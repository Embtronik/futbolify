package com.teamsservice.service;

import com.teamsservice.dto.PageResponse;
import com.teamsservice.dto.TeamCreateRequest;
import com.teamsservice.dto.TeamEventDto;
import com.teamsservice.dto.TeamResponse;
import com.teamsservice.dto.TeamUpdateRequest;
import com.teamsservice.entity.Team;
import com.teamsservice.entity.TeamMember;
import com.teamsservice.entity.TeamStatus;
import com.teamsservice.exception.ResourceNotFoundException;
import com.teamsservice.exception.DuplicateResourceException;
import com.teamsservice.mapper.TeamMapper;
import com.teamsservice.repository.TeamRepository;
import com.teamsservice.repository.TeamMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TeamService {

    private final TeamRepository teamRepository;
    private final FileStorageService fileStorageService;
    private final RabbitMQService rabbitMQService;
    private final TeamMapper teamMapper;
    private final JoinCodeGeneratorService joinCodeGeneratorService;
    private final TeamMemberRepository teamMemberRepository;

    /**
     * Método helper para buscar un equipo por ID verificando permisos (soporta userId o email)
     */
    private Team findTeamByIdAndOwner(Long teamId, Long userId, String userEmail) {
        if (userEmail != null && !userEmail.isEmpty()) {
            return teamRepository.findByIdAndOwnerEmailIgnoreCaseAndStatus(teamId, userEmail, TeamStatus.ACTIVE)
                    .orElseThrow(() -> new ResourceNotFoundException("Team not found with id: " + teamId));
        } else {
            return teamRepository.findByIdAndOwnerUserIdAndStatus(teamId, userId, TeamStatus.ACTIVE)
                    .orElseThrow(() -> new ResourceNotFoundException("Team not found with id: " + teamId));
        }
    }

    /**
     * Método helper para verificar si existe un equipo con el mismo nombre
     */
    private boolean existsByNameAndOwner(String name, Long userId, String userEmail) {
        if (userEmail != null && !userEmail.isEmpty()) {
            return teamRepository.existsByNameAndOwnerEmailIgnoreCaseAndStatus(name, userEmail, TeamStatus.ACTIVE);
        } else {
            return teamRepository.existsByNameAndOwnerUserIdAndStatus(name, userId, TeamStatus.ACTIVE);
        }
    }

    @Transactional
    public TeamResponse createTeam(TeamCreateRequest request, MultipartFile logo, Long userId, String userEmail) throws IOException {
        log.info("Creating team for user: {} (email: {})", userId, userEmail);

        // Check for duplicate team name for this user (solo equipos activos)
        if (existsByNameAndOwner(request.getName(), userId, userEmail)) {
            throw new DuplicateResourceException("Team with name '" + request.getName() + "' already exists");
        }

        // Generar código único de 6 dígitos
        String joinCode = joinCodeGeneratorService.generateUniqueCode();

        // Create team entity
        Team team = Team.builder()
                .name(request.getName())
                .description(request.getDescription())
                .address(request.getAddress())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .placeId(request.getPlaceId())
                .joinCode(joinCode)
                .ownerUserId(userId)
                .ownerEmail(userEmail)
                .status(TeamStatus.ACTIVE)
                .build();

        // Save team first to get the ID
        team = teamRepository.save(team);
        log.info("Team created with ID: {}", team.getId());

        // Handle logo upload if provided
        if (logo != null && !logo.isEmpty()) {
            String logoPath = fileStorageService.saveTeamLogo(logo, team.getId());
            team.setLogoPath(logoPath);
            team = teamRepository.save(team);
        }

        // Agregar al dueño automáticamente como miembro APROBADO
        TeamMember ownerMember = TeamMember.builder()
                .team(team)
                .userId(userId)
                .userEmail(userEmail)
                .status(TeamMember.MembershipStatus.APPROVED)
                .requestedAt(LocalDateTime.now())
                .approvedAt(LocalDateTime.now())
                .approvedBy(userId) // El dueño se auto-aprueba
                .build();
        teamMemberRepository.save(ownerMember);
        log.info("Owner {} added as approved member of team {}", userId, team.getId());

        // Publish event to RabbitMQ
        TeamEventDto event = TeamEventDto.builder()
                .teamId(team.getId())
                .teamName(team.getName())
                .userId(userId)
                .action("CREATED")
                .timestamp(LocalDateTime.now())
                .build();
        rabbitMQService.publishTeamCreated(event);

        return teamMapper.toResponse(team);
    }

    @Transactional(readOnly = true)
    public TeamResponse getTeam(Long teamId, Long userId, String userEmail) {
        log.info("Getting team {} for user {} (email: {})", teamId, userId, userEmail);
        
        Team team = findTeamByIdAndOwner(teamId, userId, userEmail);
        return teamMapper.toResponse(team);
    }

    @Transactional(readOnly = true)
    public PageResponse<TeamResponse> getUserTeams(Long userId, String userEmail, int page, int size) {
        log.info("Getting teams (page={}, size={}) for user {} (email: {})", page, size, userId, userEmail);

        if (size <= 0) {
            size = 10;
        }
        if (page < 0) {
            page = 0;
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        // Buscar por email (usuarios OAuth2) o por userId (usuarios legacy)
        Page<Team> teamsPage;
        if (userEmail != null && !userEmail.isEmpty()) {
            teamsPage = teamRepository.findByOwnerEmailIgnoreCaseAndStatus(userEmail, TeamStatus.ACTIVE, pageable);
            log.debug("Found {} teams by email", teamsPage.getTotalElements());
        } else {
            teamsPage = teamRepository.findByOwnerUserIdAndStatus(userId, TeamStatus.ACTIVE, pageable);
            log.debug("Found {} teams by userId", teamsPage.getTotalElements());
        }

        List<TeamResponse> content = teamsPage.getContent().stream()
                .map(team -> {
                    TeamResponse response = teamMapper.toResponse(team);
                    response.setMemberCount((int) teamMemberRepository
                            .countByTeamIdAndStatus(team.getId(), TeamMember.MembershipStatus.APPROVED));
                    return response;
                })
                .collect(Collectors.toList());

        return PageResponse.<TeamResponse>builder()
                .content(content)
                .page(teamsPage.getNumber())
                .size(teamsPage.getSize())
                .totalElements(teamsPage.getTotalElements())
                .totalPages(teamsPage.getTotalPages())
                .last(teamsPage.isLast())
                .build();
    }

    @Transactional
    public TeamResponse updateTeam(Long teamId, TeamUpdateRequest request, MultipartFile logo, Long userId, String userEmail) throws IOException {
        log.info("Updating team {} for user {} (email: {})", teamId, userId, userEmail);

        Team team = findTeamByIdAndOwner(teamId, userId, userEmail);

        // Update fields if provided
        if (request.getName() != null && !request.getName().isEmpty()) {
            // Check for duplicate name (excluding current team, solo activos)
            if (!team.getName().equals(request.getName()) && 
                existsByNameAndOwner(request.getName(), userId, userEmail)) {
                throw new DuplicateResourceException("Team with name '" + request.getName() + "' already exists");
            }
            team.setName(request.getName());
        }

        if (request.getDescription() != null) {
            team.setDescription(request.getDescription());
        }

        // Handle logo update if provided
        if (logo != null && !logo.isEmpty()) {
            try {
                // Delete old logo if exists
                if (team.getLogoPath() != null) {
                    fileStorageService.deleteTeamLogo(team.getLogoPath());
                }

                // Save new logo
                String logoPath = fileStorageService.saveTeamLogo(logo, team.getId());
                team.setLogoPath(logoPath);
            } catch (IOException e) {
                log.error("Error saving team logo for team {}: {}", team.getId(), e.getMessage(), e);
                // Convert to IllegalStateException so GlobalExceptionHandler returns 503
                throw new IllegalStateException("File storage unavailable");
            }
        }

        team = teamRepository.save(team);

        // Publish event to RabbitMQ
        TeamEventDto event = TeamEventDto.builder()
                .teamId(team.getId())
                .teamName(team.getName())
                .userId(userId)
                .action("UPDATED")
                .timestamp(LocalDateTime.now())
                .build();
        rabbitMQService.publishTeamUpdated(event);

        return teamMapper.toResponse(team);
    }

    @Transactional
    public void deleteTeam(Long teamId, Long userId, String userEmail) {
        log.info("Soft deleting team {} for user {} (email: {})", teamId, userId, userEmail);

        Team team = findTeamByIdAndOwner(teamId, userId, userEmail);

        // Soft delete: cambiar estado a DELETED y registrar fecha
        team.setStatus(TeamStatus.DELETED);
        team.setDeletedAt(LocalDateTime.now());
        teamRepository.save(team);

        // Publish event to RabbitMQ
        TeamEventDto event = TeamEventDto.builder()
                .teamId(team.getId())
                .teamName(team.getName())
                .userId(userId)
                .action("DELETED")
                .timestamp(LocalDateTime.now())
                .build();
        rabbitMQService.publishTeamDeleted(event);

        log.info("Team {} soft deleted successfully (status: DELETED)", teamId);
    }
}
