package com.teamsservice.repository;

import com.teamsservice.entity.Polla;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PollaRepository extends JpaRepository<Polla, Long> {

    /**
     * Encuentra todas las pollas creadas por un usuario
     */
    List<Polla> findByCreadorEmailAndDeletedAtIsNull(String email);

    /**
     * Encuentra polla por ID solo si no está eliminada
     */
    Optional<Polla> findByIdAndDeletedAtIsNull(Long id);

    /**
     * Verifica si el usuario es creador de la polla
     */
    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END " +
           "FROM Polla p WHERE p.id = :pollaId AND p.creadorEmail = :email")
    boolean isUserCreator(@Param("pollaId") Long pollaId, @Param("email") String email);

    /**
     * Pollas en estado ABIERTA donde el email es miembro aprobado de alguno de sus grupos,
     * excluyendo las pollas que el propio usuario creó (esas ya las ve en mis-pollas).
     */
    @Query("SELECT DISTINCT p FROM Polla p JOIN p.gruposInvitados g, TeamMember tm " +
           "WHERE tm.team = g " +
           "AND tm.userEmail = :email " +
           "AND tm.status = 'APPROVED' " +
           "AND p.estado = com.teamsservice.entity.Polla.PollaEstado.ABIERTA " +
           "AND p.deletedAt IS NULL " +
           "AND p.creadorEmail <> :email " +
           "ORDER BY p.createdAt DESC")
    List<Polla> findPollasAbiertasParaMiembro(@Param("email") String email);

    /**
     * Todas las pollas (cualquier estado) donde el email es miembro aprobado
     * de algún grupo asociado. Se usa para construir las 3 pestañas del frontend.
     */
    @Query("SELECT DISTINCT p FROM Polla p JOIN p.gruposInvitados g, TeamMember tm " +
           "WHERE tm.team = g " +
           "AND tm.userEmail = :email " +
           "AND tm.status = 'APPROVED' " +
           "AND p.deletedAt IS NULL " +
           "ORDER BY p.createdAt DESC")
    List<Polla> findPollasWhereUserIsMemberOfAnyGroup(@Param("email") String email);
}
