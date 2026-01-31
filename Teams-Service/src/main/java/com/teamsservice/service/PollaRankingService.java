package com.teamsservice.service;

import com.teamsservice.config.PollaScoringProperties;
import com.teamsservice.dto.PollaRankingItemResponse;
import com.teamsservice.dto.PollaRankingResponse;
import com.teamsservice.entity.Polla;
import com.teamsservice.entity.PollaPartido;
import com.teamsservice.entity.PollaPronostico;
import com.teamsservice.exception.ResourceNotFoundException;
import com.teamsservice.exception.UnauthorizedException;
import com.teamsservice.repository.PollaPartidoRepository;
import com.teamsservice.repository.PollaParticipanteRepository;
import com.teamsservice.repository.PollaPronosticoRepository;
import com.teamsservice.repository.PollaPuntajePartidoRepository;
import com.teamsservice.repository.PollaRepository;
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
public class PollaRankingService {

    private static final Logger log = LoggerFactory.getLogger(PollaRankingService.class);

    private final PollaRepository pollaRepository;
    private final PollaParticipanteRepository participanteRepository;
    private final PollaPartidoRepository partidoRepository;
    private final PollaPronosticoRepository pronosticoRepository;
    private final PollaPuntajePartidoRepository puntajePartidoRepository;
    private final AuthServiceClient authServiceClient;
    private final PollaMarcadorService marcadorService;
    private final PollaScoringProperties scoringProperties;

    public PollaRankingService(
            PollaRepository pollaRepository,
            PollaParticipanteRepository participanteRepository,
            PollaPartidoRepository partidoRepository,
            PollaPronosticoRepository pronosticoRepository,
            PollaPuntajePartidoRepository puntajePartidoRepository,
            AuthServiceClient authServiceClient,
            PollaMarcadorService marcadorService,
            PollaScoringProperties scoringProperties
    ) {
        this.pollaRepository = pollaRepository;
        this.participanteRepository = participanteRepository;
        this.partidoRepository = partidoRepository;
        this.pronosticoRepository = pronosticoRepository;
        this.puntajePartidoRepository = puntajePartidoRepository;
        this.authServiceClient = authServiceClient;
        this.marcadorService = marcadorService;
        this.scoringProperties = scoringProperties;
    }

    /**
     * Tabla de posiciones basada en marcador real (final o en vivo). Es provisional mientras la polla no esté FINALIZADA.
     */
    @Transactional
    public PollaRankingResponse getRanking(Long pollaId, String userEmail) {
        Polla polla = pollaRepository.findByIdAndDeletedAtIsNull(pollaId)
                .orElseThrow(() -> new ResourceNotFoundException("Polla not found with id: " + pollaId));

        if (!polla.getCreadorEmail().equalsIgnoreCase(userEmail)
                && !participanteRepository.existsByPollaIdAndEmailUsuario(pollaId, userEmail)) {
            throw new UnauthorizedException("No tienes acceso a esta polla");
        }

        // Regla de negocio: la tabla de posiciones es DEFINITIVA si (y solo si) TODOS los partidos están finalizados.
        // Para evitar inconsistencias (polla con estado desactualizado), aseguramos la finalización en BD.
        boolean allMatchesFinished = marcadorService.ensurePollaFinalizadaIfAllMatchesFinished(pollaId);
        if (allMatchesFinished && polla.getEstado() != Polla.PollaEstado.FINALIZADA) {
            polla = pollaRepository.findByIdAndDeletedAtIsNull(pollaId)
                    .orElseThrow(() -> new ResourceNotFoundException("Polla not found with id: " + pollaId));
        }

        boolean definitivo = allMatchesFinished || polla.getEstado() == Polla.PollaEstado.FINALIZADA;

        Map<String, Integer> pointsByEmail = new HashMap<>();

        if (definitivo) {
            // Definitivo: leer snapshot persistido en tabla dedicada
            List<Object[]> rows = puntajePartidoRepository.findTablaPosicionesDefinitiva(pollaId);
            if (rows == null || rows.isEmpty()) {
                // fallback por compatibilidad (si la tabla nueva aún no tiene datos)
                rows = pronosticoRepository.findTablaPosiciones(pollaId);
            }
            for (Object[] row : rows) {
                String email = (String) row[0];
                Number sum = (Number) row[1];
                pointsByEmail.put(email, sum != null ? sum.intValue() : 0);
            }
        } else {
            // Provisional: calcular en vivo con marcador real (TTL + lock)
            List<PollaPartido> partidos = partidoRepository.findByPollaIdOrderByFechaHoraPartidoAsc(pollaId);

            for (PollaPartido partido : partidos) {
                Integer actualHome;
                Integer actualAway;
                String statusShort;

                // Si no hay marcador en BD, pedir snapshot (TTL+lock) para LIVE/SCHEDULED.
                if (partido.getGolesLocal() == null || partido.getGolesVisitante() == null) {
                    var marcador = marcadorService.getMarcador(pollaId, partido.getId(), userEmail, false);
                    actualHome = marcador.getGolesLocal();
                    actualAway = marcador.getGolesVisitante();
                    statusShort = marcador.getApiStatusShort();
                } else {
                    actualHome = partido.getGolesLocal();
                    actualAway = partido.getGolesVisitante();
                    statusShort = partido.getApiStatusShort();
                }

                // Si el partido está NS/TBD, NO debe sumar puntos aunque venga 0-0
                if (isNotStartedStatus(statusShort)) {
                    continue;
                }

                // Si aún no hay goles (partido sin datos), no suma puntos
                if (actualHome == null || actualAway == null) {
                    continue;
                }

                // Si el partido está NS/TBD, no debe sumar puntos aunque venga 0-0.
                if (partido.getApiStatusShort() != null) {
                    String st = partido.getApiStatusShort().trim().toUpperCase();
                    if (st.equals("NS") || st.equals("TBD")) {
                        continue;
                    }
                }

                List<PollaPronostico> pronosticos = pronosticoRepository.findByPollaPartidoId(partido.getId());
                for (PollaPronostico p : pronosticos) {
                    int puntos = PollaPointsCalculator.calculate(
                            p.getGolesLocalPronosticado(),
                            p.getGolesVisitante(),
                            actualHome,
                            actualAway,
                            scoringProperties
                    );

                    pointsByEmail.merge(p.getEmailParticipante(), puntos, Integer::sum);
                }
            }
        }

        List<PollaRankingItemResponse> ranking = new ArrayList<>();
        for (Map.Entry<String, Integer> entry : pointsByEmail.entrySet()) {
            PollaRankingItemResponse item = PollaRankingItemResponse.builder()
                    .emailParticipante(entry.getKey())
                    .puntos(entry.getValue())
                    .build();

            try {
                var info = authServiceClient.getUserByEmail(entry.getKey());
                item.setUserInfo(info);
                if (info != null && info.getFullName() != null && !info.getFullName().trim().isEmpty()) {
                    item.setNombreParticipante(info.getFullName().trim());
                }
            } catch (Exception e) {
                log.debug("Could not enrich ranking user info for {}: {}", entry.getKey(), e.getMessage());
            }

            if (item.getNombreParticipante() == null || item.getNombreParticipante().trim().isEmpty()) {
                item.setNombreParticipante(item.getEmailParticipante());
            }

            ranking.add(item);
        }

        ranking.sort(Comparator.comparing(PollaRankingItemResponse::getPuntos).reversed());

        return PollaRankingResponse.builder()
                .pollaId(pollaId)
                .estadoPolla(polla.getEstado().name())
                .definitivo(definitivo)
                .ranking(ranking)
                .build();
    }

    private static boolean isNotStartedStatus(String statusShort) {
        if (statusShort == null) {
            return false;
        }
        String s = statusShort.trim().toUpperCase();
        return s.equals("NS") || s.equals("TBD");
    }
}
