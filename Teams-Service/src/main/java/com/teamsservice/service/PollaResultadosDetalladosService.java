package com.teamsservice.service;

import com.teamsservice.config.PollaScoringProperties;
import com.teamsservice.dto.ParticipanteResultadoResponse;
import com.teamsservice.dto.PartidoResultadoDetalladoResponse;
import com.teamsservice.dto.ResultadosDetalladosResponse;
import com.teamsservice.entity.Polla;
import com.teamsservice.entity.PollaPartido;
import com.teamsservice.entity.PollaPronostico;
import com.teamsservice.exception.ResourceNotFoundException;
import com.teamsservice.exception.UnauthorizedException;
import com.teamsservice.repository.PollaPartidoRepository;
import com.teamsservice.repository.PollaPronosticoRepository;
import com.teamsservice.repository.PollaRepository;
import com.teamsservice.repository.TeamMemberRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PollaResultadosDetalladosService {

    private static final Logger log = LoggerFactory.getLogger(PollaResultadosDetalladosService.class);

    private final PollaRepository pollaRepository;
    private final PollaPartidoRepository partidoRepository;
    private final PollaPronosticoRepository pronosticoRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final AuthServiceClient authServiceClient;
    private final PollaScoringProperties scoringProperties;

    /**
     * GET /api/pollas/{id}/resultados-detallados
     * Los participantes son quienes hayan ingresado al menos un pronóstico en la polla.
     * El acceso está permitido al creador o a cualquier miembro aprobado de los grupos
     * asociados a la polla. No se consulta polla_participantes.
     */
    @Transactional(readOnly = true)
    public ResultadosDetalladosResponse getResultadosDetallados(Long pollaId, String userEmail) {

        // 1. Cargar polla
        Polla polla = pollaRepository.findByIdAndDeletedAtIsNull(pollaId)
                .orElseThrow(() -> new ResourceNotFoundException("Polla no encontrada: " + pollaId));

        // 2. Control de acceso: creador, miembro aprobado de algún grupo de la polla,
        //    O cualquier participante que haya enviado al menos un pronóstico.
        boolean isCreator       = polla.getCreadorEmail().equalsIgnoreCase(userEmail);
        boolean isMember        = teamMemberRepository.isApprovedMemberOfPollaGroup(pollaId, userEmail);
        boolean isParticipant   = pronosticoRepository.existsByPollaIdAndEmailParticipante(pollaId, userEmail);
        if (!isCreator && !isMember && !isParticipant) {
            throw new UnauthorizedException("No tienes acceso a esta polla");
        }

        // 3. Partidos ordenados cronológicamente
        List<PollaPartido> partidos = partidoRepository.findByPollaIdOrderByFechaHoraPartidoAsc(pollaId);
        log.info("Polla {} tiene {} partidos", pollaId, partidos.size());

        // 4. Cargar TODOS los pronósticos de la polla en una sola query usando JOIN FETCH
        //    (JOIN FETCH garantiza que pollaPartido quede cargado sin recurrir al caché L1)
        List<PollaPronostico> todosLosPronosticos = pronosticoRepository.findAllByPollaId(pollaId);
        log.info("Polla {} tiene {} pronóstico(s) en total", pollaId, todosLosPronosticos.size());

        Map<String, Map<Long, PollaPronostico>> pronosticosPorEmailYPartido = new HashMap<>();
        for (PollaPronostico pr : todosLosPronosticos) {
            String emailPart = pr.getEmailParticipante();
            Long partidoId   = pr.getPollaPartido().getId();
            pronosticosPorEmailYPartido
                    .computeIfAbsent(emailPart, k -> new HashMap<>())
                    .put(partidoId, pr);
        }
        log.info("Polla {} tiene {} participante(s) únicos con pronóstico(s): {}",
                pollaId, pronosticosPorEmailYPartido.size(), pronosticosPorEmailYPartido.keySet());

        // 5. Los participantes son exactamente quienes ingresaron al menos un pronóstico.
        List<String> emailsParticipantes = new ArrayList<>(pronosticosPorEmailYPartido.keySet());
        log.info("Construyendo respuesta para {} participante(s)", emailsParticipantes.size());

        // 6. Construir respuesta por participante
        List<ParticipanteResultadoResponse> participantesResponse = new ArrayList<>();

        for (String email : emailsParticipantes) {
            Map<Long, PollaPronostico> misPronosticos = pronosticosPorEmailYPartido.get(email);

            List<PartidoResultadoDetalladoResponse> partidosResponse = new ArrayList<>();
            int puntajeTotal = 0;

            for (PollaPartido partido : partidos) {
                PollaPronostico pronostico = misPronosticos.get(partido.getId());

                Integer golesLocalPron     = pronostico != null ? pronostico.getGolesLocalPronosticado() : null;
                Integer golesVisitantePron = pronostico != null ? pronostico.getGolesVisitante()          : null;

                int puntos = 0;
                if (pronostico != null) {
                    if (pronostico.getPuntosObtenidos() != null) {
                        // Valor ya calculado y persistido
                        puntos = pronostico.getPuntosObtenidos();
                    } else if (partido.getGolesLocal() != null && partido.getGolesVisitante() != null) {
                        // Calcular en vivo
                        puntos = PollaPointsCalculator.calculate(
                                golesLocalPron,
                                golesVisitantePron,
                                partido.getGolesLocal(),
                                partido.getGolesVisitante(),
                                scoringProperties
                        );
                    }
                }
                puntajeTotal += puntos;

                partidosResponse.add(PartidoResultadoDetalladoResponse.builder()
                        .equipoLocal(partido.getEquipoLocal())
                        .equipoVisitante(partido.getEquipoVisitante())
                        .equipoLocalLogo(partido.getEquipoLocalLogo())
                        .equipoVisitanteLogo(partido.getEquipoVisitanteLogo())
                        .fechaHoraPartido(partido.getFechaHoraPartido())
                        .golesLocalReal(partido.getGolesLocal())
                        .golesVisitanteReal(partido.getGolesVisitante())
                        .golesLocalPronosticado(golesLocalPron)
                        .golesVisitantePronosticado(golesVisitantePron)
                        .puntosObtenidos(puntos)
                        .build());
            }

            // Resolver nombre completo desde auth-service
            String nombre = email;
            try {
                var userInfo = authServiceClient.getUserByEmail(email);
                if (userInfo != null && userInfo.getFullName() != null
                        && !userInfo.getFullName().trim().isEmpty()) {
                    nombre = userInfo.getFullName().trim();
                }
            } catch (Exception e) {
                log.debug("No se pudo obtener nombre para {}: {}", email, e.getMessage());
            }

            participantesResponse.add(ParticipanteResultadoResponse.builder()
                    .nombreParticipante(nombre)
                    .emailParticipante(email)
                    .puntajeTotal(puntajeTotal)
                    .partidos(partidosResponse)
                    .build());
        }

        // 7. Ordenar de mayor a menor por puntajeTotal
        participantesResponse.sort(Comparator.comparingInt(ParticipanteResultadoResponse::getPuntajeTotal).reversed());

        return ResultadosDetalladosResponse.builder()
                .pollaId(pollaId)
                .nombrePolla(polla.getNombre())
                .participantes(participantesResponse)
                .build();
    }
}
