package com.teamsservice.repository;

import com.teamsservice.entity.Team;
import com.teamsservice.entity.TeamStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {
    
    // Queries que solo devuelven equipos activos
    List<Team> findByOwnerUserIdAndStatus(Long ownerUserId, TeamStatus status);

    Page<Team> findByOwnerUserIdAndStatus(Long ownerUserId, TeamStatus status, Pageable pageable);
    
    Optional<Team> findByIdAndOwnerUserIdAndStatus(Long id, Long ownerUserId, TeamStatus status);
    
    boolean existsByNameAndOwnerUserIdAndStatus(String name, Long ownerUserId, TeamStatus status);
    
    // Buscar equipo por código de unión (solo activos)
    Optional<Team> findByJoinCodeAndStatus(String joinCode, TeamStatus status);
    
    // Verificar si existe un código de unión (solo activos)
    boolean existsByJoinCodeAndStatus(String joinCode, TeamStatus status);
    
    // Query para encontrar por ID y estado (para operaciones internas)
    Optional<Team> findByIdAndStatus(Long id, TeamStatus status);

    /**
     * Devuelve todos los equipos activos donde el usuario es dueño
     * O es miembro aprobado, usando email como clave. Con soporte de paginación.
     */
    @Query("SELECT DISTINCT t FROM Team t WHERE t.status = :status AND " +
           "(t.ownerEmail = :email OR t.id IN " +
           "(SELECT tm.team.id FROM TeamMember tm WHERE tm.userEmail = :email AND tm.status = 'APPROVED'))")
    Page<Team> findAllAccessibleByEmailAndStatus(
            @Param("email") String email,
            @Param("status") TeamStatus status,
            Pageable pageable);
}
