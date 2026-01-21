package com.teamsservice.service;

import com.teamsservice.dto.PartidoMarcadorResponse;
import com.teamsservice.config.PollaScoringProperties;
import com.teamsservice.entity.Polla;
import com.teamsservice.entity.PollaPartido;
import com.teamsservice.entity.PollaPuntajePartido;
import com.teamsservice.entity.PollaPronostico;
import com.teamsservice.exception.ResourceNotFoundException;
import com.teamsservice.exception.UnauthorizedException;
import com.teamsservice.repository.PollaPartidoRepository;
import com.teamsservice.repository.PollaParticipanteRepository;
import com.teamsservice.repository.PollaPuntajePartidoRepository;
import com.teamsservice.repository.PollaPronosticoRepository;
import com.teamsservice.repository.PollaRepository;
import com.teamsservice.service.apifootball.ApiFootballClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
public class PollaMarcadorService {

    private static final Logger log = LoggerFactory.getLogger(PollaMarcadorService.class);

    private static final Duration TTL_LIVE = Duration.ofSeconds(30);
    private static final Duration TTL_SCHEDULED = Duration.ofMinutes(10);

    private final PollaRepository pollaRepository;
    private final PollaParticipanteRepository participanteRepository;
    private final PollaPartidoRepository partidoRepository;
    private final PollaPronosticoRepository pronosticoRepository;
    private final PollaPuntajePartidoRepository puntajePartidoRepository;
    private final ApiFootballClient apiFootballClient;
    private final PollaScoringProperties scoringProperties;

    private final JdbcTemplate jdbcTemplate;
    private final DataSource dataSource;

    public PollaMarcadorService(
            PollaRepository pollaRepository,
            PollaParticipanteRepository participanteRepository,
            PollaPartidoRepository partidoRepository,
            PollaPronosticoRepository pronosticoRepository,
            PollaPuntajePartidoRepository puntajePartidoRepository,
            ApiFootballClient apiFootballClient,
            PollaScoringProperties scoringProperties,
            JdbcTemplate jdbcTemplate,
            DataSource dataSource
    ) {
        this.pollaRepository = pollaRepository;
        this.participanteRepository = participanteRepository;
        this.partidoRepository = partidoRepository;
        this.pronosticoRepository = pronosticoRepository;
        this.puntajePartidoRepository = puntajePartidoRepository;
        this.apiFootballClient = apiFootballClient;
        this.scoringProperties = scoringProperties;
        this.jdbcTemplate = jdbcTemplate;
        this.dataSource = dataSource;
    }

    @Transactional
    public PartidoMarcadorResponse getMarcador(Long pollaId, Long partidoId, String userEmail) {
        Polla polla = pollaRepository.findByIdAndDeletedAtIsNull(pollaId)
                .orElseThrow(() -> new ResourceNotFoundException("Polla not found with id: " + pollaId));

        if (!polla.getCreadorEmail().equalsIgnoreCase(userEmail)
                && !participanteRepository.existsByPollaIdAndEmailUsuario(pollaId, userEmail)) {
            throw new UnauthorizedException("No tienes acceso a esta polla");
        }

        PollaPartido partido = partidoRepository.findByIdAndPollaId(partidoId, pollaId)
                .orElseThrow(() -> new ResourceNotFoundException("Partido not found with id: " + partidoId));

        // Regla 1: si ya está finalizado y hay marcador definitivo -> no API
        if ((Boolean.TRUE.equals(partido.getPartidoFinalizado()) || isFinishedStatus(partido.getApiStatusShort()))
                && partido.getGolesLocal() != null
                && partido.getGolesVisitante() != null) {
            if (!Boolean.TRUE.equals(partido.getPartidoFinalizado())) {
                partido.setPartidoFinalizado(true);
                partido = partidoRepository.save(partido);
            }

            finalizePollaIfAllMatchesFinished(pollaId);

            log.debug("PollaPartido {} served from DB (finished + definitive score)", partidoId);
            return toResponse(pollaId, partido, "DB", null);
        }

        Duration ttl = determineTtl(partido.getApiStatusShort(), partido.getGolesLocal(), partido.getGolesVisitante());

        // TTL infinito (FINISHED + score definitivo): responder siempre desde BD
        if (ttl == null) {
            if (!Boolean.TRUE.equals(partido.getPartidoFinalizado())) {
                partido.setPartidoFinalizado(true);
                partido = partidoRepository.save(partido);
            }

            finalizePollaIfAllMatchesFinished(pollaId);

            return toResponse(pollaId, partido, "DB", null);
        }

        // Regla 2: si TTL no ha expirado -> responder desde BD
        if (ttl != null && ttl.toMillis() > 0 && partido.getLastApiSyncAt() != null) {
            Duration age = Duration.between(partido.getLastApiSyncAt(), LocalDateTime.now());
            if (age.compareTo(ttl) < 0) {
                log.debug("PollaPartido {} served from DB (TTL hit, age={}ms ttl={}ms)", partidoId, age.toMillis(), ttl.toMillis());
                return toResponse(pollaId, partido, "DB", ttl.getSeconds());
            }
        }

        boolean shouldCallApi = ttl.isZero() || ttl.isNegative() || partido.getLastApiSyncAt() == null;

        if (!shouldCallApi) {
            // safety net
            return toResponse(pollaId, partido, "DB", ttl != null ? ttl.getSeconds() : null);
        }

        // Anti-cache-stampede: lock por matchId/fixtureId
        String lockKey = lockKeyForPartido(partido);

        if (!isPostgres()) {
            // tests / non-postgres: just call API (no lock)
            log.info("Non-Postgres datasource detected; syncing without advisory lock for pollaPartido={}", partidoId);
            partido = syncFromApi(partido);
            return toResponse(pollaId, partido, "API", ttlSeconds(ttl));
        }

        boolean locked = tryAdvisoryLock(lockKey);
        if (locked) {
            try {
                // Releer dentro del lock por si otro nodo lo actualizó justo antes
                PollaPartido fresh = partidoRepository.findById(partido.getId()).orElse(partido);
                if (Boolean.TRUE.equals(fresh.getPartidoFinalizado())
                        && fresh.getGolesLocal() != null
                        && fresh.getGolesVisitante() != null) {
                    return toResponse(pollaId, fresh, "DB", null);
                }

                Duration freshTtl = determineTtl(fresh.getApiStatusShort(), fresh.getGolesLocal(), fresh.getGolesVisitante());
                if (freshTtl == null) {
                    if (!Boolean.TRUE.equals(fresh.getPartidoFinalizado())) {
                        fresh.setPartidoFinalizado(true);
                        fresh = partidoRepository.save(fresh);
                    }

                    finalizePollaIfAllMatchesFinished(pollaId);

                    return toResponse(pollaId, fresh, "DB", null);
                }
                if (freshTtl != null && freshTtl.toMillis() > 0 && fresh.getLastApiSyncAt() != null) {
                    Duration age = Duration.between(fresh.getLastApiSyncAt(), LocalDateTime.now());
                    if (age.compareTo(freshTtl) < 0) {
                        return toResponse(pollaId, fresh, "DB", freshTtl.getSeconds());
                    }
                }

                PollaPartido updated = syncFromApi(fresh);

                if (Boolean.TRUE.equals(updated.getPartidoFinalizado())) {
                    finalizePollaIfAllMatchesFinished(pollaId);
                }

                return toResponse(pollaId, updated, "API", ttlSeconds(freshTtl));
            } finally {
                unlockAdvisoryLock(lockKey);
            }
        }

        // No lock (otro request refrescando): esperar breve y leer BD
        int waits = 0;
        while (waits < 3) {
            sleepMillis(250);
            waits++;

            PollaPartido after = partidoRepository.findById(partido.getId()).orElse(partido);

            // si cambió lastApiSyncAt, devolvemos
            if (after.getLastApiSyncAt() != null && (partido.getLastApiSyncAt() == null
                    || after.getLastApiSyncAt().isAfter(partido.getLastApiSyncAt()))) {
                log.debug("PollaPartido {} served from DB after waiting for lock (waits={})", partidoId, waits);
                Duration afterTtl = determineTtl(after.getApiStatusShort(), after.getGolesLocal(), after.getGolesVisitante());
                return toResponse(pollaId, after, "DB", ttlSeconds(afterTtl));
            }
        }

        log.warn("PollaPartido {} lock wait timed out; serving stale DB data", partidoId);
        return toResponse(pollaId, partido, "DB", ttlSeconds(ttl));
    }

    private PollaPartido syncFromApi(PollaPartido partido) {
        String fixtureId = partido.getIdPartidoExterno();

        log.info("Syncing fixture from API-Football: pollaPartidoId={} fixtureId={}", partido.getId(), fixtureId);

        ApiFootballClient.FixtureSnapshot snapshot = apiFootballClient.fetchFixtureById(fixtureId);

        partido.setApiStatusShort(snapshot.getStatusShort());
        partido.setApiStatusLong(snapshot.getStatusLong());

        // Importante: API-Football suele devolver 0-0 cuando el partido está NS (not started).
        // Para evitar sumar puntos antes de iniciar, tratamos NS/TBD como "sin marcador".
        if (isNotStartedStatus(snapshot.getStatusShort())) {
            partido.setGolesLocal(null);
            partido.setGolesVisitante(null);
        } else {
            partido.setGolesLocal(snapshot.getHomeGoals());
            partido.setGolesVisitante(snapshot.getAwayGoals());
        }
        partido.setLastApiSyncAt(LocalDateTime.ofInstant(snapshot.getFetchedAt(), ZoneId.systemDefault()));

        boolean finished = isFinishedStatus(snapshot.getStatusShort())
                && snapshot.getHomeGoals() != null
                && snapshot.getAwayGoals() != null;

        if (finished) {
            partido.setPartidoFinalizado(true);
        }

        PollaPartido saved = partidoRepository.save(partido);

        if (finished) {
            // Nota: no persistimos puntos por partido hasta que TODA la polla esté FINALIZADA.
        }

        return saved;
    }

    private static boolean isNotStartedStatus(String statusShort) {
        if (statusShort == null) {
            return false;
        }
        String s = statusShort.trim().toUpperCase();
        return s.equals("NS") || s.equals("TBD");
    }

    private void finalizePollaIfAllMatchesFinished(Long pollaId) {
        try {
            long total = partidoRepository.countTotalByPollaId(pollaId);
            if (total <= 0) {
                return;
            }

            long finished = partidoRepository.countFinalizadosByPollaId(pollaId);
            if (finished < total) {
                return;
            }

            Polla polla = pollaRepository.findByIdAndDeletedAtIsNull(pollaId)
                    .orElseThrow(() -> new ResourceNotFoundException("Polla not found with id: " + pollaId));

            if (polla.getEstado() == Polla.PollaEstado.FINALIZADA) {
                // Idempotente: si ya está FINALIZADA, igual aseguramos que puntos estén persistidos
                persistFinalPointsForPolla(pollaId);
                return;
            }

            polla.setEstado(Polla.PollaEstado.FINALIZADA);
            pollaRepository.save(polla);

            persistFinalPointsForPolla(pollaId);

            log.info("Polla {} marked as FINALIZADA (finishedMatches={}/{})", pollaId, finished, total);
        } catch (Exception e) {
            // No romper el endpoint por esto; sólo log
            log.warn("Could not finalize polla {} after match finished: {}", pollaId, e.getMessage());
        }
    }

    private void persistFinalPointsForPolla(Long pollaId) {
        try {
            List<PollaPartido> partidos = partidoRepository.findByPollaIdOrderByFechaHoraPartidoAsc(pollaId);
            for (PollaPartido partido : partidos) {
                if (!Boolean.TRUE.equals(partido.getPartidoFinalizado())) {
                    continue;
                }
                if (partido.getGolesLocal() == null || partido.getGolesVisitante() == null) {
                    continue;
                }

                List<PollaPronostico> pronosticos = pronosticoRepository.findByPollaPartidoId(partido.getId());
                for (PollaPronostico p : pronosticos) {
                    int puntos = PollaPointsCalculator.calculate(
                            p.getGolesLocalPronosticado(),
                            p.getGolesVisitante(),
                            partido.getGolesLocal(),
                            partido.getGolesVisitante(),
                            scoringProperties
                    );

                    // Persistencia clara: tabla dedicada de puntajes por partido/participante
                    PollaPuntajePartido puntaje = puntajePartidoRepository
                            .findByPollaPartidoIdAndEmailParticipante(partido.getId(), p.getEmailParticipante())
                            .orElseGet(() -> PollaPuntajePartido.builder()
                                    .pollaPartido(partido)
                                    .emailParticipante(p.getEmailParticipante())
                                    .definitivo(true)
                                    .build());
                    puntaje.setPuntos(puntos);
                    puntaje.setDefinitivo(true);
                    puntajePartidoRepository.save(puntaje);

                    // Back-compat: mantener también en pronóstico
                    p.setPuntosObtenidos(puntos);
                }
                pronosticoRepository.saveAll(pronosticos);
            }

            log.info("Persisted final polla points for pollaId={}", pollaId);
        } catch (Exception e) {
            log.warn("Failed to persist final polla points for pollaId={}: {}", pollaId, e.getMessage());
        }
    }

    private static Duration determineTtl(String statusShort, Integer homeScore, Integer awayScore) {
        // FINISHED -> infinito si ya tenemos marcador definitivo
        if (isFinishedStatus(statusShort) && homeScore != null && awayScore != null) {
            return null; // infinito
        }

        if (isLiveStatus(statusShort)) {
            return TTL_LIVE;
        }

        // scheduled / not started / unknown
        return TTL_SCHEDULED;
    }

    private static boolean isFinishedStatus(String statusShort) {
        if (statusShort == null) {
            return false;
        }
        String s = statusShort.trim().toUpperCase();
        return s.equals("FT") || s.equals("AET") || s.equals("PEN");
    }

    private static boolean isLiveStatus(String statusShort) {
        if (statusShort == null) {
            return false;
        }
        String s = statusShort.trim().toUpperCase();
        return s.equals("1H") || s.equals("2H") || s.equals("HT") || s.equals("ET") || s.equals("BT")
                || s.equals("P") || s.equals("LIVE");
    }

    private static Long ttlSeconds(Duration ttl) {
        return ttl == null ? null : ttl.getSeconds();
    }

    private PartidoMarcadorResponse toResponse(Long pollaId, PollaPartido partido, String servedFrom, Long ttlSeconds) {
        return PartidoMarcadorResponse.builder()
                .pollaId(pollaId)
                .pollaPartidoId(partido.getId())
                .idPartidoExterno(partido.getIdPartidoExterno())
                .apiStatusShort(partido.getApiStatusShort())
                .apiStatusLong(partido.getApiStatusLong())
                .golesLocal(partido.getGolesLocal())
                .golesVisitante(partido.getGolesVisitante())
                .partidoFinalizado(partido.getPartidoFinalizado())
                .lastApiSyncAt(partido.getLastApiSyncAt())
                .servedFrom(servedFrom)
                .ttlSeconds(ttlSeconds)
                .build();
    }

    private static String lockKeyForPartido(PollaPartido partido) {
        // Use external fixture id, but normalized to avoid weird spacing
        String fixtureId = partido.getIdPartidoExterno() != null ? partido.getIdPartidoExterno().trim() : String.valueOf(partido.getId());
        return "polla_fixture:" + fixtureId;
    }

    private boolean isPostgres() {
        try (Connection connection = dataSource.getConnection()) {
            String url = connection.getMetaData().getURL();
            return url != null && url.startsWith("jdbc:postgresql:");
        } catch (Exception e) {
            return false;
        }
    }

    private boolean tryAdvisoryLock(String key) {
        long lockId = lockId(key);
        try {
            Boolean ok = jdbcTemplate.queryForObject("SELECT pg_try_advisory_lock(?)", Boolean.class, lockId);
            boolean acquired = Boolean.TRUE.equals(ok);
            log.debug("Advisory lock {} acquired={} (id={})", key, acquired, lockId);
            return acquired;
        } catch (Exception e) {
            log.warn("Failed to acquire advisory lock for key={} (falling back to no-lock)", key, e);
            return true; // safest: allow one caller to proceed
        }
    }

    private void unlockAdvisoryLock(String key) {
        long lockId = lockId(key);
        try {
            jdbcTemplate.queryForObject("SELECT pg_advisory_unlock(?)", Boolean.class, lockId);
        } catch (Exception e) {
            log.debug("Failed to unlock advisory lock key={} (id={})", key, lockId, e);
        }
    }

    private static long lockId(String key) {
        // stable 64-bit lock id derived from String (avoid collisions as much as possible)
        long h = 1125899906842597L; // prime
        for (int i = 0; i < key.length(); i++) {
            h = 31L * h + key.charAt(i);
        }
        return h;
    }

    private static void sleepMillis(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }
}
