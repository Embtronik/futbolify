package com.teamsservice.service;

import com.teamsservice.config.PollaScoringProperties;
import com.teamsservice.dto.ParticipanteResultadoResponse;
import com.teamsservice.dto.PartidoResultadoDetalladoResponse;
import com.teamsservice.dto.ResultadosDetalladosResponse;
import com.teamsservice.entity.Polla;
import com.teamsservice.entity.PollaParticipante;
import com.teamsservice.entity.PollaPartido;
import com.teamsservice.entity.PollaPronostico;
import com.teamsservice.exception.ResourceNotFoundException;
import com.teamsservice.exception.UnauthorizedException;
import com.teamsservice.repository.PollaParticipanteRepository;
import com.teamsservice.repository.PollaPartidoRepository;
import com.teamsservice.repository.PollaPronosticoRepository;
import com.teamsservice.repository.PollaRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PollaResultadosDetalladosService {

    private static final Logger log = LoggerFactory.getLogger(PollaResultadosDetalladosService.class);

    private final PollaRepository pollaRepository;
    private final PollaParticipanteRepository participanteRepository;
    private final PollaPartidoRepository partidoRepository;
    private final PollaPronosticoRepository pronosticoRepository;
    private final AuthServiceClient authServiceClient;
    private final PollaScoringProperties scoringProperties;

    /**
     * GET /api/pollas/{id}/resultados-detallados
     * Retorna, por cada participante aceptado, su lista de partidos con pronóstico,
     * resultado real y puntos obtenidos. Ordenado de mayor a menor puntajeTotal.
     */
    @Transactional(readOnly = true)
    public ResultadosDetalladosResponse getResultadosDetallados(Long pollaId, String userEmail) {

        // 1. Cargar polla
        Polla polla = pollaRepository.findByIdAndDeletedAtIsNull(pollaId)
                .orElseThrow(() -> new ResourceNotFoundException("Polla no encontrada: " + pollaId));

        // 2. Control de acceso: creador o participante invitado/aceptado
        boolean isCreator = polla.getCreadorEmail().equalsIgnoreCase(userEmail);
        boolean isParticipant = participanteRepository.existsByPollaIdAndEmailUsuario(pollaId, userEmail);
        if (!isCreator && !isParticipant) {
            throw new UnauthorizedException("No tienes acceso a esta polla");
        }

        // 3. Partidos ordenados cronológicamente
        List<PollaPartido> partidos = partidoRepository.findByPollaIdOrderByFechaHoraPartidoAsc(pollaId);

        // 4. Participantes aceptados + creador (si no está ya en la lista)
        List<PollaParticipante> participantesAceptados = participanteRepository.findByPollaId(pollaId)
                .stream()
                .filter(p -> p.getEstado() == PollaParticipante.EstadoParticipante.ACEPTADO)
                .toList();

        Set<String> emails = new LinkedHashSet<>();
        emails.add(polla.getCreadorEmail()); // el creador primero
        participantesAceptados.forEach(p -> emails.add(p.getEmailUsuario()));

        // 5. Cargar TODOS los pronósticos de la polla en una sola query
        //    y agrupar: emailParticipante → (pollaPartidoId → PollaPronostico)
        List<PollaPronostico> todosLosPronosticos = pronosticoRepository.findAllByPollaId(pollaId);
        Map<String, Map<Long, PollaPronostico>> pronosticosPorEmailYPartido = new HashMap<>();
        for (PollaPronostico pr : todosLosPronosticos) {
            pronosticosPorEmailYPartido
                    .computeIfAbsent(pr.getEmailParticipante(), k -> new HashMap<>())
                    .put(pr.getPollaPartido().getId(), pr);
        }

        // 6. Construir respuesta por participante
        List<ParticipanteResultadoResponse> participantesResponse = new ArrayList<>();

        for (String email : emails) {
            Map<Long, PollaPronostico> misPronosticos =
                    pronosticosPorEmailYPartido.getOrDefault(email, Map.of());

            List<PartidoResultadoDetalladoResponse> partidosResponse = new ArrayList<>();
            int puntajeTotal = 0;

            for (PollaPartido partido : partidos) {
                PollaPronostico pronostico = misPronosticos.get(partido.getId());

                Integer golesLocalPron = pronostico != null ? pronostico.getGolesLocalPronosticado() : null;
                Integer golesVisitantePron = pronostico != null ? pronostico.getGolesVisitante() : null;

                int puntos = 0;
                if (pronostico != null) {
                    if (pronostico.getPuntosObtenidos() != null) {
                        // Usar el valor ya calculado y persistido
                        puntos = pronostico.getPuntosObtenidos();
                    } else if (partido.getGolesLocal() != null && partido.getGolesVisitante() != null) {
                        // Calcular en vivo con las reglas de negocio configuradas
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
