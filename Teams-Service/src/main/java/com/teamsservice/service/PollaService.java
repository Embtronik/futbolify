package com.teamsservice.service;

import com.teamsservice.dto.*;
import com.teamsservice.entity.*;
import com.teamsservice.exception.BusinessRuleException;
import com.teamsservice.exception.ResourceNotFoundException;
import com.teamsservice.exception.UnauthorizedException;
import com.teamsservice.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PollaService {
    private final PollaRepository pollaRepository;
    private final PollaPartidoRepository partidoRepository;
    private final PollaPronosticoRepository pronosticoRepository;
    private final PollaParticipanteRepository participanteRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final AuthServiceClient authServiceClient;
    private final NotificationServiceClient notificationServiceClient;
    /**
     * Crea una nueva polla, valida grupos y agrega al creador como participante aceptado.
     */
    @Transactional
    public PollaResponse crearPolla(PollaCreateRequest request, String userEmail) {
        log.info("Creating polla '{}' by user {} with {} groups", request.getNombre(), userEmail, request.getGruposIds().size());
        
        // Validar y obtener los grupos seleccionados
        // Verifica que el usuario sea miembro aprobado de todos los grupos
        List<Team> gruposSeleccionados = validateAndGetGrupos(request.getGruposIds(), userEmail);
        
        // Crear la polla con todos los datos
        Polla polla = Polla.builder()
                .nombre(request.getNombre())
                .descripcion(request.getDescripcion())
                .creadorEmail(userEmail)
                .fechaInicio(request.getFechaInicio())
                .montoEntrada(request.getMontoEntrada())
                .estado(Polla.PollaEstado.CREADA)
                .gruposInvitados(gruposSeleccionados) // Los grupos determinan quién puede acceder
                .build();
        
        // Guardar la polla
        Polla saved = pollaRepository.save(polla);
        
        // NO agregamos participantes explícitos aquí
        // Los participantes se determinan dinámicamente: cualquier miembro aprobado de los grupos invitados puede acceder
        // Esto permite que nuevos miembros agregados al grupo después de crear la polla puedan participar automáticamente
        
        log.info("Polla {} created successfully with {} groups. All approved members of these groups can participate.", 
                saved.getId(), gruposSeleccionados.size());
        
        return mapToResponse(saved, userEmail);
    }

    /**
     * Registra o actualiza un pronóstico individual
     */
    @Transactional
    public PronosticoResponse registrarPronostico(Long pollaId, PronosticoRequest request, String userEmail) {
        log.info("User {} registering forecast for partido {} in polla {}", userEmail, request.getPollaPartidoId(), pollaId);

        // Verificar acceso del usuario a la polla
        validateUserAccess(pollaId, userEmail);

        // Buscar el partido
        PollaPartido partido = partidoRepository.findById(request.getPollaPartidoId())
                .orElseThrow(() -> new ResourceNotFoundException("Partido not found with id: " + request.getPollaPartidoId()));

        // Verificar que el partido pertenece a la polla
        if (!partido.getPolla().getId().equals(pollaId)) {
            throw new BusinessRuleException("El partido no pertenece a esta polla");
        }

        // Verificar que aún se puede pronosticar
        if (!partido.puedePronosticar()) {
            throw new BusinessRuleException("Ya no se puede pronosticar este partido");
        }

        // Buscar o crear el pronóstico
        PollaPronostico pronostico = pronosticoRepository
                .findByPollaPartidoIdAndEmailParticipante(partido.getId(), userEmail)
                .orElse(PollaPronostico.builder()
                        .pollaPartido(partido)
                        .emailParticipante(userEmail)
                        .build());

        pronostico.setGolesLocalPronosticado(request.getGolesLocalPronosticado());
        pronostico.setGolesVisitante(request.getGolesVisitantePronosticado());

        pronostico = pronosticoRepository.save(pronostico);
        log.info("Forecast registered successfully");

        // After saving, check if the user has completed all forecasts for the polla
        try {
            checkAndNotifyIfCompleted(pollaId, userEmail);
        } catch (Exception e) {
            log.warn("Error while checking/completing notifications for {}: {}", userEmail, e.getMessage());
        }

        return mapPronosticoToResponse(pronostico);
    }

    /**
     * Registra o actualiza múltiples pronósticos en un solo request
     */
    @Transactional
    public List<PronosticoResponse> registrarPronosticosBatch(Long pollaId, List<PronosticoRequest> requests, String userEmail) {
        log.info("User {} registering batch forecasts ({} items) for polla {}", userEmail, requests != null ? requests.size() : 0, pollaId);

        if (requests == null || requests.isEmpty()) {
            throw new BusinessRuleException("La lista de pronósticos no puede estar vacía");
        }

        // To avoid sending duplicate notifications, save all pronósticos in batch and
        // run the completion check only once after all are persisted.
        List<PollaPronostico> toSave = requests.stream().map(req -> {
            PollaPronostico p = pronosticoRepository
                    .findByPollaPartidoIdAndEmailParticipante(req.getPollaPartidoId(), userEmail)
                    .orElse(PollaPronostico.builder()
                            .pollaPartido(partidoRepository.findById(req.getPollaPartidoId()).orElseThrow(() -> new ResourceNotFoundException("Partido not found with id: " + req.getPollaPartidoId())))
                            .emailParticipante(userEmail)
                            .build());

            p.setGolesLocalPronosticado(req.getGolesLocalPronosticado());
            p.setGolesVisitante(req.getGolesVisitantePronosticado());
            return p;
        }).collect(Collectors.toList());

        List<PollaPronostico> saved = pronosticoRepository.saveAll(toSave);

        // After saving all, run completion check once
        try {
            checkAndNotifyIfCompleted(pollaId, userEmail);
        } catch (Exception e) {
            log.warn("Error while checking/completing notifications for {}: {}", userEmail, e.getMessage());
        }

        return saved.stream().map(this::mapPronosticoToResponse).collect(Collectors.toList());
    }

    /**
     * Obtiene todas las pollas del usuario (creadas o donde es miembro de algún grupo invitado)
     */
    @Transactional(readOnly = true)
    public List<PollaResponse> getMisPollas(String userEmail) {
        log.info("Getting all pollas for user: {}", userEmail);

        // Obtener pollas creadas por el usuario (todas, sin importar el estado)
        List<Polla> pollasCreadas = pollaRepository.findByCreadorEmailAndDeletedAtIsNull(userEmail);

        // Obtener pollas donde el usuario es participante
        List<Polla> pollasComoParticipante = pollaRepository.findPollasWhereUserIsParticipant(userEmail);

        // Obtener equipos del usuario para encontrar pollas donde sus grupos fueron invitados
        List<Long> userTeamIds = teamMemberRepository
                .findApprovedTeamsByUserEmail(userEmail)
                .stream()
                .map(tm -> tm.getTeam().getId())
                .toList();

        List<Polla> pollasDeGruposInvitados = List.of();
        if (!userTeamIds.isEmpty()) {
            pollasDeGruposInvitados = pollaRepository.findByGruposInvitadosIn(userTeamIds);
            // Filtrar: solo mostrar pollas ABIERTA, CERRADA o FINALIZADA
            // Las pollas en estado CREADA solo las ve el creador
            pollasDeGruposInvitados = pollasDeGruposInvitados.stream()
                    .filter(p -> !p.getCreadorEmail().equalsIgnoreCase(userEmail) // No es creador
                            ? p.getEstado() != Polla.PollaEstado.CREADA // Solo ver pollas activadas
                            : true) // Si es creador, ver todas
                    .collect(Collectors.toList());
        }

        // Combinar todas las pollas y eliminar duplicados
        List<Polla> todasLasPollas = new java.util.ArrayList<>(pollasCreadas);
        todasLasPollas.addAll(pollasComoParticipante);
        todasLasPollas.addAll(pollasDeGruposInvitados);

        List<Polla> pollas = todasLasPollas.stream()
                .distinct()
                .sorted((p1, p2) -> p2.getCreatedAt().compareTo(p1.getCreatedAt()))
                .toList();

        return pollas.stream()
                .map(p -> mapToResponse(p, userEmail))
                .collect(Collectors.toList());
    }

    /**
     * Obtiene el detalle completo de una polla
     */
    @Transactional(readOnly = true)
    public PollaResponse getPolla(Long pollaId, String userEmail) {
        log.info("Getting polla {} for user {}", pollaId, userEmail);

        validateUserAccess(pollaId, userEmail);

        Polla polla = pollaRepository.findByIdAndDeletedAtIsNull(pollaId)
                .orElseThrow(() -> new ResourceNotFoundException("Polla not found with id: " + pollaId));

        return mapToResponse(polla, userEmail);
    }

    /**
     * Acepta invitación a una polla (agrega al usuario como participante explícito)
     * 
     * NOTA: Este método es OPCIONAL y solo para casos especiales:
     * - Confirmación explícita de participación
     * - Invitaciones individuales fuera de grupos
     * 
     * Para el flujo normal, NO es necesario llamar este método.
     * Los miembros aprobados de los grupos invitados pueden acceder automáticamente.
     */
    @Transactional
    public void aceptarInvitacion(Long pollaId, String userEmail) {
        log.info("User {} accepting invitation to polla {} (explicit confirmation)", userEmail, pollaId);

        validateUserAccess(pollaId, userEmail);

        Polla polla = pollaRepository.findByIdAndDeletedAtIsNull(pollaId)
                .orElseThrow(() -> new ResourceNotFoundException("Polla not found with id: " + pollaId));

        // Verificar si ya es participante explícito
        if (participanteRepository.existsByPollaIdAndEmailUsuario(pollaId, userEmail)) {
            log.info("User {} is already an explicit participant in polla {}", userEmail, pollaId);
            return;
        }

        // Agregar como participante explícito (opcional)
        PollaParticipante participante = PollaParticipante.builder()
                .polla(polla)
                .emailUsuario(userEmail)
                .build();

        participanteRepository.save(participante);
        log.info("User {} added as explicit participant to polla {}", userEmail, pollaId);
    }

    /**
     * Rechaza invitación o sale de una polla
     * 
     * NOTA: Este método permite al usuario hacer "opt-out" de una polla,
     * incluso si es miembro de un grupo invitado.
     * Si está en la tabla de participantes explícitos, lo elimina.
     */
    @Transactional
    public void rechazarInvitacion(Long pollaId, String userEmail) {
        log.info("User {} rejecting invitation / opting out of polla {}", userEmail, pollaId);

        // No validar acceso porque el usuario podría querer salir de la polla

        participanteRepository.findByPollaIdAndEmailUsuario(pollaId, userEmail)
                .ifPresent(participante -> {
                    participanteRepository.delete(participante);
                    log.info("User {} removed from polla {}", userEmail, pollaId);
                });
    }

    /**
     * Agrega un partido a la polla
     */
    @Transactional
    public PartidoResponse agregarPartido(Long pollaId, PartidoRequest request, String userEmail) {
        log.info("Adding match to polla {} by user {}", pollaId, userEmail);

        // Solo el creador puede agregar partidos
        Polla polla = validateCreatorAccess(pollaId, userEmail);

        // Verificar que la polla esté en estado CREADA
        if (polla.getEstado() != Polla.PollaEstado.CREADA) {
            throw new BusinessRuleException("Solo se pueden agregar partidos cuando la polla está en estado CREADA");
        }

        // Verificar que no exista ya un partido con el mismo idPartidoExterno
        if (partidoRepository.existsByPollaIdAndIdPartidoExterno(pollaId, request.getIdPartidoExterno())) {
            throw new BusinessRuleException("Ya existe un partido con el ID externo: " + request.getIdPartidoExterno());
        }

        PollaPartido partido = PollaPartido.builder()
                .polla(polla)
                .idPartidoExterno(request.getIdPartidoExterno())
                .equipoLocal(request.getEquipoLocal())
                .equipoLocalLogo(request.getEquipoLocalLogo())
                .equipoVisitante(request.getEquipoVisitante())
                .equipoVisitanteLogo(request.getEquipoVisitanteLogo())
                .liga(request.getLiga())
                .fechaHoraPartido(request.getFechaHoraPartido())
                .build();

        partido = partidoRepository.save(partido);
        log.info("Match {} added to polla {}", partido.getId(), pollaId);

        return mapPartidoToResponse(partido);
    }

    /**
     * Activa una polla (cambia el estado a ABIERTA)
     */
    @Transactional
    public void activarPolla(Long pollaId, String userEmail) {
        log.info("Activating polla {} by user {}", pollaId, userEmail);

        Polla polla = validateCreatorAccess(pollaId, userEmail);

        if (polla.getEstado() != Polla.PollaEstado.CREADA) {
            throw new BusinessRuleException("Solo se puede activar una polla en estado CREADA");
        }

        // Verificar que tenga al menos un partido
        long partidosCount = partidoRepository.countTotalByPollaId(pollaId);
        if (partidosCount == 0) {
            throw new BusinessRuleException("No se puede activar una polla sin partidos");
        }

        polla.setEstado(Polla.PollaEstado.ABIERTA);
        pollaRepository.save(polla);
        log.info("Polla {} activated successfully", pollaId);
    }

    /**
     * Si el participante tiene pronósticos para todos los partidos de la polla, envía notificaciones
     * al participante y al creador con el resumen de los marcadores que puso.
     */
    private void checkAndNotifyIfCompleted(Long pollaId, String userEmail) {
        long totalMatches = partidoRepository.countTotalByPollaId(pollaId);
        long userForecasts = pronosticoRepository.findByPollaIdAndEmail(pollaId, userEmail).size();

        if (totalMatches > 0 && userForecasts == totalMatches) {
            // obtener creador de la polla
            Polla polla = pollaRepository.findByIdAndDeletedAtIsNull(pollaId)
                    .orElseThrow(() -> new ResourceNotFoundException("Polla not found with id: " + pollaId));

            String creadorEmail = polla.getCreadorEmail();

            // construir resumen de marcadores del participante
            List<PollaPronostico> pronosticos = pronosticoRepository.findByPollaIdAndEmail(pollaId, userEmail);

            String participantName = null;
            String creatorName = null;
            try {
                if (userEmail != null) participantName = authServiceClient.getUserByEmail(userEmail).getFullName();
            } catch (Exception e) {
                log.warn("Could not fetch user info for {}: {}", userEmail, e.getMessage());
            }
            try {
                if (creadorEmail != null) creatorName = authServiceClient.getUserByEmail(creadorEmail).getFullName();
            } catch (Exception e) {
                log.warn("Could not fetch creator info for {}: {}", creadorEmail, e.getMessage());
            }


            // Build concise notifications (no detalles de marcadores) and notify via EMAIL, SMS, WHATSAPP
            String body = "Has registrado tus pronósticos para la polla '" + polla.getNombre() + "'. Gracias por participar.";
            String creatorBody = "El participante " + (participantName != null ? participantName : userEmail)
                    + " ha registrado sus pronósticos en la polla '" + polla.getNombre() + "'.";

            List<String> channels = List.of("EMAIL", "SMS", "WHATSAPP");

            String participantPhone = null;
            String creatorPhone = null;
            try {
                if (userEmail != null) {
                    var u = authServiceClient.getUserByEmail(userEmail);
                    if (u != null && u.getPhoneNumber() != null) {
                        participantPhone = (u.getCountryCode() != null ? u.getCountryCode() : "") + u.getPhoneNumber();
                    }
                }
            } catch (Exception e) {
                log.warn("Could not fetch participant phone for {}: {}", userEmail, e.getMessage());
            }

            try {
                if (creadorEmail != null) {
                    var c = authServiceClient.getUserByEmail(creadorEmail);
                    if (c != null && c.getPhoneNumber() != null) {
                        creatorPhone = (c.getCountryCode() != null ? c.getCountryCode() : "") + c.getPhoneNumber();
                    }
                }
            } catch (Exception e) {
                log.warn("Could not fetch creator phone for {}: {}", creadorEmail, e.getMessage());
            }

                NotificationSendRequest toParticipant = NotificationSendRequest.builder()
                    .channels(channels)
                    .recipient(userEmail)
                    .recipientPhone(participantPhone)
                    .subject("Has completado tus pronósticos en " + polla.getNombre())
                    .body(body)
                    .serviceOrigin("teams-service")
                    .build();

                NotificationSendRequest toCreator = NotificationSendRequest.builder()
                    .channels(channels)
                    .recipient(creadorEmail)
                    .recipientPhone(creatorPhone)
                    .subject("Participante completó pronósticos en " + polla.getNombre())
                    .body(creatorBody)
                    .serviceOrigin("teams-service")
                    .build();

            try {
                notificationServiceClient.sendNotification(toParticipant);
            } catch (Exception e) {
                log.error("Error sending notification to participant {}: {}", userEmail, e.getMessage());
            }

            try {
                if (creadorEmail != null && !creadorEmail.isBlank()) {
                    notificationServiceClient.sendNotification(toCreator);
                }
            } catch (Exception e) {
                log.error("Error sending notification to creator {}: {}", creadorEmail, e.getMessage());
            }
        }
    }

    @Transactional(readOnly = true)
    public List<PartidoResponse> getPartidos(Long pollaId, String userEmail) {
        log.info("Getting matches for polla {} by user {}", pollaId, userEmail);

        // Verificar acceso
        validateUserAccess(pollaId, userEmail);

        List<PollaPartido> partidos = partidoRepository.findByPollaIdOrderByFechaHoraPartidoAsc(pollaId);

        return partidos.stream()
                .map(this::mapPartidoToResponse)
                .collect(Collectors.toList());
    }

            /**
             * Obtiene los pronósticos del usuario autenticado para todos los partidos de una polla
             */
            @Transactional(readOnly = true)
            public List<PronosticoResponse> getMisPronosticos(Long pollaId, String userEmail) {
            log.info("Getting user's forecasts for polla {} by user {}", pollaId, userEmail);

            // Verificar acceso
            validateUserAccess(pollaId, userEmail);

            // Obtener partidos y filtrar el pronóstico del usuario por cada partido
            List<PollaPartido> partidos = partidoRepository.findByPollaIdOrderByFechaHoraPartidoAsc(pollaId);

            return partidos.stream()
                .map(p -> pronosticoRepository
                    .findByPollaPartidoIdAndEmailParticipante(p.getId(), userEmail)
                    .orElse(null))
                .filter(Objects::nonNull)
                .map(this::mapPronosticoToResponse)
                .collect(Collectors.toList());
            }

    // Métodos auxiliares de validación

    private List<Team> validateAndGetGrupos(List<Long> gruposIds, String userEmail) {
        List<Team> grupos = teamRepository.findAllById(gruposIds);
        
        if (grupos.size() != gruposIds.size()) {
            throw new ResourceNotFoundException("Algunos grupos no fueron encontrados");
        }

        // Verificar que el usuario es miembro de todos los grupos
        for (Team grupo : grupos) {
            if (!teamMemberRepository.existsByTeamIdAndUserEmailAndStatus(
                    grupo.getId(), userEmail, TeamMember.MembershipStatus.APPROVED)) {
                throw new UnauthorizedException("No eres miembro del grupo: " + grupo.getName());
            }
        }

        return grupos;
    }



    private Polla validateCreatorAccess(Long pollaId, String userEmail) {
        Polla polla = pollaRepository.findByIdAndDeletedAtIsNull(pollaId)
                .orElseThrow(() -> new ResourceNotFoundException("Polla not found with id: " + pollaId));

        if (!polla.getCreadorEmail().equals(userEmail)) {
            throw new UnauthorizedException("Solo el creador puede realizar esta acción");
        }

        return polla;
    }

    private void validateUserAccess(Long pollaId, String userEmail) {
        // Acceso solo para creador o miembro aprobado de algún grupo
        Polla polla = pollaRepository.findByIdAndDeletedAtIsNull(pollaId)
                .orElseThrow(() -> new ResourceNotFoundException("Polla not found with id: " + pollaId));
        boolean esCreador = polla.getCreadorEmail().equalsIgnoreCase(userEmail);
        boolean esMiembroAprobadoGrupo = false;
        if (polla.getGruposInvitados() != null && !polla.getGruposInvitados().isEmpty()) {
            List<Long> gruposIds = polla.getGruposInvitados().stream()
                .map(Team::getId)
                .toList();
            esMiembroAprobadoGrupo = teamMemberRepository.existsByTeamIdInAndUserEmailAndStatus(
                gruposIds, userEmail, com.teamsservice.entity.TeamMember.MembershipStatus.APPROVED);
        }
        if (!esCreador && !esMiembroAprobadoGrupo) {
            throw new UnauthorizedException("No tienes acceso a esta polla");
        }
    }

    // Métodos de mapeo

    private PollaResponse mapToResponse(Polla polla, String emailUsuarioAutenticado) {
        // Mapear participantes
        List<ParticipanteResponse> participantesResponse = polla.getParticipantes() != null
                ? polla.getParticipantes().stream()
                        .map(this::mapParticipanteToResponse)
                        .collect(Collectors.toList())
                : List.of();

        // Mapear partidos (solo IDs básicos, no detalles completos)
        List<PartidoResponse> partidosResponse = polla.getPartidos() != null
                ? polla.getPartidos().stream()
                        .map(this::mapPartidoToResponse)
                        .collect(Collectors.toList())
                : List.of();

        // Mapear grupos invitados
        List<GrupoSimpleResponse> gruposResponse = polla.getGruposInvitados() != null && !polla.getGruposInvitados().isEmpty()
                ? polla.getGruposInvitados().stream()
                        .map(g -> GrupoSimpleResponse.builder()
                                .id(g.getId())
                                .name(g.getName())
                                .logoUrl(g.getLogoPath())
                                .build())
                        .collect(Collectors.toList())
                : java.util.Collections.emptyList();

        // Contar participantes reales: solo aquellos que han agregado al menos un pronóstico
        long totalParticipantesReales = pronosticoRepository.countUniqueParticipantsByPollaId(polla.getId());

        return PollaResponse.builder()
                .id(polla.getId())
                .nombre(polla.getNombre())
                .descripcion(polla.getDescripcion())
                .creadorEmail(polla.getCreadorEmail())
                .fechaInicio(polla.getFechaInicio())
                .montoEntrada(polla.getMontoEntrada())
                .totalParticipantes((int) totalParticipantesReales)
                .totalPartidos(polla.getPartidos() != null ? polla.getPartidos().size() : 0)
                .participantes(participantesResponse)
                .partidos(partidosResponse)
                .gruposInvitados(gruposResponse)
                .createdAt(polla.getCreatedAt())
                .updatedAt(polla.getUpdatedAt())
                .emailUsuarioAutenticado(emailUsuarioAutenticado)
                .estado(polla.getEstado() != null ? polla.getEstado().name() : null)
                .build();
    }

    private ParticipanteResponse mapParticipanteToResponse(PollaParticipante participante) {
        if (participante == null) {
            return null;
        }

        UserInfoDto userInfo = null;
        try {
            userInfo = authServiceClient.getUserByEmail(participante.getEmailUsuario());
        } catch (Exception e) {
            log.warn("Could not fetch user info for {}: {}", participante.getEmailUsuario(), e.getMessage());
        }

        return ParticipanteResponse.builder()
                .id(participante.getId())
                .emailUsuario(participante.getEmailUsuario())
                .userInfo(userInfo)
                .build();
    }

    private PartidoResponse mapPartidoToResponse(PollaPartido partido) {
        List<PronosticoResponse> pronosticos = partido.getPronosticos() != null && !partido.getPronosticos().isEmpty()
            ? partido.getPronosticos().stream().map(this::mapPronosticoToResponse).collect(Collectors.toList())
            : List.of();
        return PartidoResponse.builder()
            .id(partido.getId())
            .idPartidoExterno(partido.getIdPartidoExterno())
            .equipoLocal(partido.getEquipoLocal())
            .equipoLocalLogo(partido.getEquipoLocalLogo())
            .equipoVisitante(partido.getEquipoVisitante())
            .equipoVisitanteLogo(partido.getEquipoVisitanteLogo())
            .liga(partido.getLiga())
            .fechaHoraPartido(partido.getFechaHoraPartido())
            .fechaLimitePronostico(partido.getFechaLimitePronostico())
            .golesLocal(partido.getGolesLocal())
            .golesVisitante(partido.getGolesVisitante())
            .partidoFinalizado(partido.getPartidoFinalizado())
            .puedePronosticar(partido.puedePronosticar())
            .pronosticos(pronosticos)
            .createdAt(partido.getCreatedAt())
            .build();
    }

    private PronosticoResponse mapPronosticoToResponse(PollaPronostico pronostico) {
        UserInfoDto userInfo = null;
        try {
            userInfo = authServiceClient.getUserByEmail(pronostico.getEmailParticipante());
        } catch (Exception ignored) {}
        return PronosticoResponse.builder()
                .id(pronostico.getId())
                .emailParticipante(pronostico.getEmailParticipante())
                .golesLocalPronosticado(pronostico.getGolesLocalPronosticado())
                .golesVisitantePronosticado(pronostico.getGolesVisitante())
                .fechaRegistro(pronostico.getFechaRegistro())
                .fechaActualizacion(pronostico.getFechaActualizacion())
                .puntosObtenidos(pronostico.getPuntosObtenidos())
                .userInfo(userInfo)
                .build();
    }

    /**
     * Permite al creador volver el estado de la polla a CREADA si está en estado ABIERTA
     */
    @Transactional
    public void volverACreada(Long pollaId, String userEmail) {
        log.info("Intentando volver a estado CREADA la polla {} por usuario {}", pollaId, userEmail);
        Polla polla = pollaRepository.findByIdAndDeletedAtIsNull(pollaId)
                .orElseThrow(() -> new ResourceNotFoundException("Polla not found with id: " + pollaId));

        if (!polla.getCreadorEmail().equals(userEmail)) {
            throw new UnauthorizedException("Solo el creador puede modificar el estado a CREADA");
        }
        if (polla.getEstado() != Polla.PollaEstado.ABIERTA) {
            throw new BusinessRuleException("Solo se puede volver a CREADA si la polla está en estado ABIERTA");
        }
        polla.setEstado(Polla.PollaEstado.CREADA);
        pollaRepository.save(polla);
        log.info("Polla {} cambiada a estado CREADA correctamente", pollaId);
    }

    @Transactional
    public void eliminarPolla(Long pollaId, String userEmail) {
        log.info("Attempting to soft delete polla {} by user {}", pollaId, userEmail);

        Polla polla = pollaRepository.findByIdAndDeletedAtIsNull(pollaId)
                .orElseThrow(() -> new ResourceNotFoundException("Polla not found with id: " + pollaId));

        if (!polla.getCreadorEmail().equals(userEmail)) {
            throw new UnauthorizedException("Only the creator can delete the polla");
        }

        polla.setDeletedAt(LocalDateTime.now());
        pollaRepository.save(polla);
        log.info("Polla {} soft deleted", pollaId);
    }

    /**
     * Eliminar un partido de una polla. Solo el creador puede hacerlo y solo cuando la polla está en estado CREADA.
     * Elimina también los pronósticos asociados al partido.
     */
    @Transactional
    public void eliminarPartido(Long pollaId, Long partidoId, String userEmail) {
        log.info("Attempting to delete partido {} from polla {} by user {}", partidoId, pollaId, userEmail);

        // Verificar que el usuario sea el creador
        Polla polla = validateCreatorAccess(pollaId, userEmail);

        // Solo se permiten cambios en estado CREADA
        if (polla.getEstado() != Polla.PollaEstado.CREADA) {
            throw new BusinessRuleException("Solo se pueden eliminar partidos cuando la polla está en estado CREADA");
        }

        // Buscar partido dentro de la polla
        PollaPartido partido = partidoRepository.findByIdAndPollaId(partidoId, pollaId)
                .orElseThrow(() -> new ResourceNotFoundException("Partido not found with id: " + partidoId + " in polla " + pollaId));

        // No permitir eliminar partidos ya finalizados
        if (Boolean.TRUE.equals(partido.getPartidoFinalizado())) {
            throw new BusinessRuleException("No se puede eliminar un partido ya finalizado");
        }

        // Eliminar pronósticos relacionados
        var pronosticos = pronosticoRepository.findByPollaPartidoId(partido.getId());
        if (pronosticos != null && !pronosticos.isEmpty()) {
            pronosticoRepository.deleteAll(pronosticos);
            log.info("Deleted {} pronosticos for partido {}", pronosticos.size(), partido.getId());
        }

        // Eliminar el partido
        partidoRepository.delete(partido);
        log.info("Partido {} deleted from polla {}", partidoId, pollaId);
    }

    /**
     * Obtiene los resultados detallados de una polla.
     * Incluye SOLO los participantes que hicieron al menos un pronóstico,
     * con sus pronósticos, marcadores reales y puntos por partido.
     */
    @Transactional(readOnly = true)
    public PollaResultadoDetalladoResponse getResultadosDetallados(Long pollaId, String userEmail) {
        log.info("Getting detailed results for polla {} by user {}", pollaId, userEmail);

        // Verificar acceso
        validateUserAccess(pollaId, userEmail);

        Polla polla = pollaRepository.findByIdAndDeletedAtIsNull(pollaId)
                .orElseThrow(() -> new ResourceNotFoundException("Polla not found with id: " + pollaId));

        // Obtener todos los partidos de la polla
        List<PollaPartido> partidos = partidoRepository.findByPollaIdOrderByFechaHoraPartidoAsc(pollaId);

        // Obtener todos los pronósticos de la polla agrupados por participante
        List<PollaPronostico> todosPronosticos = pronosticoRepository.findByPollaPartidoPollaId(pollaId);

        // Agrupar pronósticos por participante
        Map<String, List<PollaPronostico>> pronosticosPorParticipante = todosPronosticos.stream()
                .collect(Collectors.groupingBy(PollaPronostico::getEmailParticipante));

        // Crear resultado detallado SOLO para participantes que hicieron pronósticos
        List<ParticipanteResultadoDetallado> participantesResultados = pronosticosPorParticipante.entrySet().stream()
                .map(entry -> {
                    String email = entry.getKey();
                    List<PollaPronostico> pronosticosParticipante = entry.getValue();

                    // Obtener info del usuario
                    UserInfoDto userInfo = null;
                    String nombreParticipante = email;
                    try {
                        userInfo = authServiceClient.getUserByEmail(email);
                        if (userInfo != null && userInfo.getFullName() != null) {
                            nombreParticipante = userInfo.getFullName();
                        }
                    } catch (Exception e) {
                        log.warn("Could not fetch user info for {}: {}", email, e.getMessage());
                    }

                    // Calcular puntaje total
                    int puntajeTotal = pronosticosParticipante.stream()
                            .mapToInt(p -> p.getPuntosObtenidos() != null ? p.getPuntosObtenidos() : 0)
                            .sum();

                    // Crear detalle de cada partido
                    List<PartidoResultado> partidosResultado = partidos.stream()
                            .map(partido -> {
                                // Buscar el pronóstico del participante para este partido
                                PollaPronostico pronostico = pronosticosParticipante.stream()
                                        .filter(p -> p.getPollaPartido().getId().equals(partido.getId()))
                                        .findFirst()
                                        .orElse(null);

                                return PartidoResultado.builder()
                                        .partidoId(partido.getId())
                                        .idPartidoExterno(partido.getIdPartidoExterno())
                                        .equipoLocal(partido.getEquipoLocal())
                                        .equipoLocalLogo(partido.getEquipoLocalLogo())
                                        .equipoVisitante(partido.getEquipoVisitante())
                                        .equipoVisitanteLogo(partido.getEquipoVisitanteLogo())
                                        .liga(partido.getLiga())
                                        .fechaHoraPartido(partido.getFechaHoraPartido())
                                        .golesLocalReal(partido.getGolesLocal())
                                        .golesVisitanteReal(partido.getGolesVisitante())
                                        .golesLocalPronosticado(pronostico != null ? pronostico.getGolesLocalPronosticado() : null)
                                        .golesVisitantePronosticado(pronostico != null ? pronostico.getGolesVisitante() : null)
                                        .puntosObtenidos(pronostico != null ? pronostico.getPuntosObtenidos() : 0)
                                        .build();
                            })
                            .collect(Collectors.toList());

                    return ParticipanteResultadoDetallado.builder()
                            .emailParticipante(email)
                            .nombreParticipante(nombreParticipante)
                            .userInfo(userInfo)
                            .puntajeTotal(puntajeTotal)
                            .partidos(partidosResultado)
                            .build();
                })
                .sorted((p1, p2) -> Integer.compare(p2.getPuntajeTotal(), p1.getPuntajeTotal())) // Ordenar por puntaje desc
                .collect(Collectors.toList());

        return PollaResultadoDetalladoResponse.builder()
                .pollaId(pollaId)
                .nombrePolla(polla.getNombre())
                .estadoPolla(polla.getEstado().name())
                .finalizada(polla.getEstado() == Polla.PollaEstado.FINALIZADA)
                .participantes(participantesResultados)
                .build();
    }

}
