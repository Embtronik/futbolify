package com.teamsservice.service;

import com.teamsservice.entity.Polla;
import com.teamsservice.entity.Team;
import com.teamsservice.entity.TeamMember;
import com.teamsservice.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class PollaServiceTest {

    @Mock
    private PollaRepository pollaRepository;
    @Mock
    private PollaParticipanteRepository participanteRepository;
    @Mock
    private PollaPartidoRepository partidoRepository;
    @Mock
    private PollaPronosticoRepository pronosticoRepository;
    @Mock
    private TeamRepository teamRepository;
    @Mock
    private TeamMemberRepository teamMemberRepository;
    @Mock
    private AuthServiceClient authServiceClient;

    @InjectMocks
    private PollaService pollaService;

    @Test
    public void getMisPollas_includesPollasFromApprovedTeams() {
        String userEmail = "user@example.com";

        // Polla creada por el usuario
        Polla creada = Polla.builder()
                .id(1L)
                .nombre("Creada")
                .creadorEmail(userEmail)
                .fechaInicio(LocalDateTime.now())
                .montoEntrada(new BigDecimal("10.00"))
                .build();

        // Polla donde el usuario es participante directo
        Polla participada = Polla.builder()
                .id(2L)
                .nombre("Participada")
                .creadorEmail("otro@example.com")
                .fechaInicio(LocalDateTime.now())
                .montoEntrada(new BigDecimal("5.00"))
                .build();

        // Polla asociada a un grupo (teamId = 100)
        Team grupo = Team.builder().id(100L).name("Grupo A").build();
        Polla porGrupo = Polla.builder()
                .id(3L)
                .nombre("PorGrupo")
                .creadorEmail("otro2@example.com")
                .fechaInicio(LocalDateTime.now())
                .montoEntrada(new BigDecimal("2.00"))
                .gruposInvitados(List.of(grupo))
                .build();

        when(pollaRepository.findByCreadorEmailAndDeletedAtIsNull(userEmail))
                .thenReturn(List.of(creada));
        when(pollaRepository.findPollasWhereUserIsParticipant(userEmail))
                .thenReturn(List.of(participada));

        // Usuario aprobado en team 100
        TeamMember tm = TeamMember.builder().team(grupo).userId(500L).status(TeamMember.MembershipStatus.APPROVED).build();
        when(teamMemberRepository.findApprovedTeamsByUserEmail(userEmail)).thenReturn(List.of(tm));
        when(pollaRepository.findByGruposInvitadosIn(List.of(100L))).thenReturn(List.of(porGrupo));

        List<com.teamsservice.dto.PollaResponse> results = pollaService.getMisPollas(userEmail);

        assertNotNull(results);
        // Debe contener las 3 pollas (creada, participada, porGrupo)
        assertEquals(3, results.size());
        assertTrue(results.stream().anyMatch(p -> p.getId().equals(1L)));
        assertTrue(results.stream().anyMatch(p -> p.getId().equals(2L)));
        assertTrue(results.stream().anyMatch(p -> p.getId().equals(3L)));
    }
}
