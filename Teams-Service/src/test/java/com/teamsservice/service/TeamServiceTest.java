package com.teamsservice.service;

import com.teamsservice.dto.PageResponse;
import com.teamsservice.dto.TeamCreateRequest;
import com.teamsservice.dto.TeamEventDto;
import com.teamsservice.dto.TeamResponse;
import com.teamsservice.entity.Team;
import com.teamsservice.entity.TeamStatus;
import com.teamsservice.entity.TeamMember;
import com.teamsservice.exception.DuplicateResourceException;
import com.teamsservice.exception.ResourceNotFoundException;
import com.teamsservice.mapper.TeamMapper;
import com.teamsservice.repository.TeamRepository;
import com.teamsservice.repository.TeamMemberRepository;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TeamServiceTest {

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private FileStorageService fileStorageService;

    @Mock
    private RabbitMQService rabbitMQService;

    @Mock
    private TeamMapper teamMapper;

    @Mock
    private JoinCodeGeneratorService joinCodeGeneratorService;

    @Mock
    private TeamMemberRepository teamMemberRepository;

    @InjectMocks
    private TeamService teamService;

    private Team testTeam;
    private TeamCreateRequest createRequest;
    private TeamResponse teamResponse;
    private Long userId;

    @BeforeEach
    void setUp() {
        userId = 1L;
        
        testTeam = Team.builder()
                .id(1L)
                .name("Barcelona FC")
                .description("Professional soccer team")
                .ownerUserId(userId)
                .build();

        createRequest = TeamCreateRequest.builder()
                .name("Barcelona FC")
                .description("Professional soccer team")
                .build();

        teamResponse = TeamResponse.builder()
                .id(1L)
                .name("Barcelona FC")
                .description("Professional soccer team")
                .ownerUserId(userId)
                .build();
    }

    @Test
    void createTeam_Success() throws IOException {
        // Arrange
        when(teamRepository.existsByNameAndOwnerUserIdAndStatus(anyString(), anyLong(), eq(TeamStatus.ACTIVE))).thenReturn(false);
        when(joinCodeGeneratorService.generateUniqueCode()).thenReturn("ABC123");
        when(teamRepository.save(any(Team.class))).thenReturn(testTeam);
        when(teamMapper.toResponse(any(Team.class))).thenReturn(teamResponse);

        // Act
        TeamResponse result = teamService.createTeam(createRequest, null, userId, "test@example.com");

        // Assert
        assertNotNull(result);
        assertEquals("Barcelona FC", result.getName());
        verify(teamRepository).save(any(Team.class));
        verify(rabbitMQService).publishTeamCreated(any(TeamEventDto.class));
    }

    @Test
    void createTeam_DuplicateName_ThrowsException() {
        // Arrange
        when(teamRepository.existsByNameAndOwnerUserIdAndStatus(anyString(), anyLong(), eq(TeamStatus.ACTIVE))).thenReturn(true);

        // Act & Assert
        assertThrows(DuplicateResourceException.class, 
            () -> teamService.createTeam(createRequest, null, userId, "test@example.com"));
        
        verify(teamRepository, never()).save(any(Team.class));
    }

    @Test
    void getTeam_Success() {
        // Arrange
        when(teamRepository.findByIdAndOwnerUserIdAndStatus(anyLong(), anyLong(), eq(TeamStatus.ACTIVE))).thenReturn(Optional.of(testTeam));
        when(teamMapper.toResponse(any(Team.class))).thenReturn(teamResponse);

        // Act
        TeamResponse result = teamService.getTeam(1L, userId);

        // Assert
        assertNotNull(result);
        assertEquals(1L, result.getId());
        verify(teamRepository).findByIdAndOwnerUserIdAndStatus(1L, userId, TeamStatus.ACTIVE);
    }

    @Test
    void getTeam_NotFound_ThrowsException() {
        // Arrange
        when(teamRepository.findByIdAndOwnerUserIdAndStatus(anyLong(), anyLong(), eq(TeamStatus.ACTIVE))).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(ResourceNotFoundException.class, 
            () -> teamService.getTeam(1L, userId));
    }

    @Test
    void getUserTeams_Success() {
        // Arrange
        List<Team> teams = Arrays.asList(testTeam);
        when(teamRepository.findByOwnerUserIdAndStatus(eq(userId), eq(TeamStatus.ACTIVE), any(Pageable.class)))
            .thenReturn(new PageImpl<>(teams));
        when(teamMapper.toResponse(any(Team.class))).thenReturn(teamResponse);
        when(teamMemberRepository.countByTeamIdAndStatus(eq(testTeam.getId()), eq(TeamMember.MembershipStatus.APPROVED)))
            .thenReturn(1L);

        // Act
        PageResponse<TeamResponse> result = teamService.getUserTeams(userId, 0, 10);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        assertEquals(1, result.getTotalElements());
        assertEquals(1, result.getContent().get(0).getMemberCount());
        verify(teamRepository).findByOwnerUserIdAndStatus(eq(userId), eq(TeamStatus.ACTIVE), any(Pageable.class));
    }

    @Test
    void deleteTeam_Success() {
        // Arrange
        when(teamRepository.findByIdAndOwnerUserIdAndStatus(anyLong(), anyLong(), eq(TeamStatus.ACTIVE))).thenReturn(Optional.of(testTeam));

        // Act
        teamService.deleteTeam(1L, userId);

        // Assert
        verify(teamRepository).save(testTeam);
        verify(rabbitMQService).publishTeamDeleted(any(TeamEventDto.class));
    }

    @Test
    void deleteTeam_NotFound_ThrowsException() {
        // Arrange
        when(teamRepository.findByIdAndOwnerUserIdAndStatus(anyLong(), anyLong(), eq(TeamStatus.ACTIVE))).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(ResourceNotFoundException.class, 
            () -> teamService.deleteTeam(1L, userId));
        
        verify(teamRepository, never()).save(any(Team.class));
    }
}
