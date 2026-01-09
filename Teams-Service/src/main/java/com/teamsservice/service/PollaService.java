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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PollaService {
    private final PollaRepository pollaRepository;
    private final PollaParticipanteRepository participanteRepository;
    private final PollaPartidoRepository partidoRepository;
    private final PollaPronosticoRepository pronosticoRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final AuthServiceClient authServiceClient;

    /**
     * Cambia el estado de la polla a ABIERTA si está en estado CREADA y el usuario es el creador
     */
    @Transactional
    public void activarPolla(Long pollaId, String userEmail) {
        log.info("Intentando activar polla {} por usuario {}", pollaId, userEmail);
        Polla polla = pollaRepository.findByIdAndDeletedAtIsNull(pollaId)
                .orElseThrow(() -> new ResourceNotFoundException("Polla not found with id: " + pollaId));

        if (!polla.getCreadorEmail().equals(userEmail)) {
            throw new UnauthorizedException("Solo el creador puede activar la polla");
        }
        if (polla.getEstado() != Polla.PollaEstado.CREADA) {
            throw new BusinessRuleException("La polla ya fue activada o no está en estado CREADA");
        }
        polla.setEstado(Polla.PollaEstado.ABIERTA);
        pollaRepository.save(polla);
        log.info("Polla {} activada correctamente", pollaId);
    }



    @Transactional(readOnly = true)
    public PollaResponse getPolla(Long pollaId, String userEmail) {
        log.info("Getting polla {} for user {}", pollaId, userEmail);

        Polla polla = pollaRepository.findByIdAndDeletedAtIsNull(pollaId)
                .orElseThrow(() -> new ResourceNotFoundException("Polla not found with id: " + pollaId));

        // Verificar que el usuario tiene acceso (es creador o participante)
        if (!polla.getCreadorEmail().equals(userEmail) &&
            !participanteRepository.existsByPollaIdAndEmailUsuario(pollaId, userEmail)) {
            throw new UnauthorizedException("No tienes acceso a esta polla");
        }

        PollaResponse response = mapToResponse(polla);
        response.setEmailUsuarioAutenticado(userEmail);
        return response;
    }

    @Transactional(readOnly = true)
        public List<PollaResponse> getMisPollas(String userEmail) {
        log.info("Getting all pollas for user: {}", userEmail);

        // Pollas creadas por el usuario
        List<Polla> pollasCreadas = pollaRepository.findByCreadorEmailAndDeletedAtIsNull(userEmail);

        // Pollas donde es participante
        List<Polla> pollasParticipante = pollaRepository.findPollasWhereUserIsParticipant(userEmail);

        // Combinar y eliminar duplicados
        List<Polla> todasLasPollas = pollasCreadas.stream()
            .collect(Collectors.toList());
        
        pollasParticipante.stream()
            .filter(p -> !todasLasPollas.contains(p))
            .forEach(todasLasPollas::add);

        return todasLasPollas.stream()
            .map(polla -> {
                PollaResponse resp = mapToResponse(polla);
                resp.setEmailUsuarioAutenticado(userEmail);
                return resp;
            })
            .collect(Collectors.toList());
        }

    @Transactional
    public void aceptarInvitacion(Long pollaId, String userEmail) {
        log.info("User {} accepting invitation to polla {}", userEmail, pollaId);

        PollaParticipante participante = participanteRepository
                .findByPollaIdAndEmailUsuario(pollaId, userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Invitación no encontrada"));

        if (participante.getEstado() != PollaParticipante.EstadoParticipante.INVITADO) {
            throw new BusinessRuleException("La invitación ya fue respondida");
        }

        participante.setEstado(PollaParticipante.EstadoParticipante.ACEPTADO);
        participante.setFechaRespuesta(LocalDateTime.now());
        participanteRepository.save(participante);

        log.info("Invitation accepted successfully");
    }

    @Transactional
    public void rechazarInvitacion(Long pollaId, String userEmail) {
        log.info("User {} rejecting invitation to polla {}", userEmail, pollaId);

        PollaParticipante participante = participanteRepository
                .findByPollaIdAndEmailUsuario(pollaId, userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Invitación no encontrada"));

        if (participante.getEstado() != PollaParticipante.EstadoParticipante.INVITADO) {
            throw new BusinessRuleException("La invitación ya fue respondida");
        }

        participante.setEstado(PollaParticipante.EstadoParticipante.RECHAZADO);
        participante.setFechaRespuesta(LocalDateTime.now());
        participanteRepository.save(participante);

        log.info("Invitation rejected successfully");
    }

    @Transactional
    public PartidoResponse agregarPartido(Long pollaId, PartidoRequest request, String userEmail) {
        log.info("Adding match {} to polla {}", request.getIdPartidoExterno(), pollaId);

        // Verificar que el usuario es el creador
        Polla polla = validateCreatorAccess(pollaId, userEmail);

        // Validar que el partido no fue agregado previamente
        if (partidoRepository.existsByPollaIdAndIdPartidoExterno(pollaId, request.getIdPartidoExterno())) {
            throw new BusinessRuleException("Este partido ya fue agregado a la polla");
        }

        // Validar que la fecha del partido es futura
        if (request.getFechaHoraPartido().isBefore(LocalDateTime.now())) {
            throw new BusinessRuleException("No se pueden agregar partidos pasados");
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
            .partidoFinalizado(false)
            .build();

        partido = partidoRepository.save(partido);
        log.info("Match added successfully with ID: {}", partido.getId());

        return mapPartidoToResponse(partido);
    }

    @Transactional
    public PronosticoResponse registrarPronostico(Long pollaId, PronosticoRequest request, String userEmail) {
        log.info("User {} registering forecast for match {} in polla {}", 
                 userEmail, request.getPollaPartidoId(), pollaId);

        // Verificar que el usuario es participante aceptado
        if (!participanteRepository.isUserAceptado(pollaId, userEmail)) {
            throw new UnauthorizedException("Debes ser participante aceptado para pronosticar");
        }

        // Obtener el partido
        PollaPartido partido = partidoRepository.findByIdAndPollaId(request.getPollaPartidoId(), pollaId)
                .orElseThrow(() -> new ResourceNotFoundException("Partido no encontrado"));

        // Validar que aún está dentro del tiempo límite
        if (!partido.puedePronosticar()) {
            throw new BusinessRuleException("Ya no se pueden registrar pronósticos para este partido");
        }

        // Buscar pronóstico existente o crear nuevo
        PollaPronostico pronostico = pronosticoRepository
                .findByPollaPartidoIdAndEmailParticipante(request.getPollaPartidoId(), userEmail)
                .orElse(PollaPronostico.builder()
                        .pollaPartido(partido)
                        .emailParticipante(userEmail)
                        .build());

        pronostico.setGolesLocalPronosticado(request.getGolesLocalPronosticado());
        pronostico.setGolesVisitante(request.getGolesVisitantePronosticado());

        pronostico = pronosticoRepository.save(pronostico);
        log.info("Forecast registered successfully");

        return mapPronosticoToResponse(pronostico);
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

    private void validateInvitados(List<String> emails, List<Team> grupos) {
        for (String email : emails) {
            boolean esMiembroDeAlgunGrupo = grupos.stream()
                    .anyMatch(grupo -> teamMemberRepository.existsByTeamIdAndUserEmailAndStatus(
                            grupo.getId(), email, TeamMember.MembershipStatus.APPROVED));

            if (!esMiembroDeAlgunGrupo) {
                throw new BusinessRuleException(
                    "El usuario " + email + " no es miembro de ninguno de los grupos seleccionados");
            }
        }
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
        if (!pollaRepository.isUserCreator(pollaId, userEmail) &&
            !participanteRepository.existsByPollaIdAndEmailUsuario(pollaId, userEmail)) {
            throw new UnauthorizedException("No tienes acceso a esta polla");
        }
    }

    // Métodos de mapeo

    private PollaResponse mapToResponse(Polla polla) {
        List<ParticipanteResponse> participantes = polla.getParticipantes().stream()
                .map(this::mapParticipanteToResponse)
                .collect(Collectors.toList());

        List<PartidoResponse> partidos = polla.getPartidos().stream()
                .map(this::mapPartidoToResponse)
                .collect(Collectors.toList());

        List<GrupoSimpleResponse> grupos = polla.getGruposInvitados().stream()
                .map(g -> GrupoSimpleResponse.builder()
                        .id(g.getId())
                        .name(g.getName())
                        .logoUrl(g.getLogoPath())
                        .build())
                .collect(Collectors.toList());

        return PollaResponse.builder()
                .id(polla.getId())
                .nombre(polla.getNombre())
                .descripcion(polla.getDescripcion())
                .creadorEmail(polla.getCreadorEmail())
                .fechaInicio(polla.getFechaInicio())
                .montoEntrada(polla.getMontoEntrada())
                .estado(polla.getEstado().name())
                .totalParticipantes(participantes.size())
                .totalPartidos(partidos.size())
                .participantes(participantes)
                .partidos(partidos)
                .gruposInvitados(grupos)
                .createdAt(polla.getCreatedAt())
                .updatedAt(polla.getUpdatedAt())
                .build();
    }

    private ParticipanteResponse mapParticipanteToResponse(PollaParticipante participante) {
        ParticipanteResponse response = ParticipanteResponse.builder()
                .id(participante.getId())
                .emailUsuario(participante.getEmailUsuario())
                .estado(participante.getEstado().name())
                .fechaInvitacion(participante.getFechaInvitacion())
                .fechaRespuesta(participante.getFechaRespuesta())
                .build();

        // Enriquecer con datos del usuario
        try {
            UserInfoDto userInfo = authServiceClient.getUserByEmail(participante.getEmailUsuario());
            response.setUserInfo(userInfo);
        } catch (Exception e) {
            log.warn("Could not fetch user info for email {}: {}", 
                     participante.getEmailUsuario(), e.getMessage());
        }

        return response;
    }

    private PartidoResponse mapPartidoToResponse(PollaPartido partido) {
        List<PronosticoResponse> pronosticos = partido.getPronosticos().stream()
                .map(this::mapPronosticoToResponse)
                .collect(Collectors.toList());

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
        PronosticoResponse response = PronosticoResponse.builder()
                .id(pronostico.getId())
                .emailParticipante(pronostico.getEmailParticipante())
                .golesLocalPronosticado(pronostico.getGolesLocalPronosticado())
                .golesVisitantePronosticado(pronostico.getGolesVisitante())
                .fechaRegistro(pronostico.getFechaRegistro())
                .fechaActualizacion(pronostico.getFechaActualizacion())
                .puntosObtenidos(pronostico.getPuntosObtenidos())
                .build();

        // Enriquecer con datos del usuario
        try {
            UserInfoDto userInfo = authServiceClient.getUserByEmail(pronostico.getEmailParticipante());
            response.setUserInfo(userInfo);
        } catch (Exception e) {
            log.warn("Could not fetch user info for email {}: {}", 
                     pronostico.getEmailParticipante(), e.getMessage());
        }

        return response;
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

}
