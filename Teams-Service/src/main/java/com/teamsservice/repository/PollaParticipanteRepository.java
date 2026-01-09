package com.teamsservice.repository;

import com.teamsservice.entity.PollaParticipante;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PollaParticipanteRepository extends JpaRepository<PollaParticipante, Long> {

    /**
     * Encuentra todos los participantes de una polla
     */
    List<PollaParticipante> findByPollaId(Long pollaId);

    /**
     * Encuentra participante específico en una polla
     */
    Optional<PollaParticipante> findByPollaIdAndEmailUsuario(Long pollaId, String email);

    /**
     * Verifica si un usuario ya fue invitado a una polla
     */
    boolean existsByPollaIdAndEmailUsuario(Long pollaId, String email);

    /**
     * Cuenta participantes aceptados
     */
    @Query("SELECT COUNT(pp) FROM PollaParticipante pp " +
           "WHERE pp.polla.id = :pollaId " +
           "AND pp.estado = 'ACEPTADO'")
    long countAceptadosByPollaId(@Param("pollaId") Long pollaId);

    /**
     * Verifica si el usuario es participante aceptado
     */
    @Query("SELECT CASE WHEN COUNT(pp) > 0 THEN true ELSE false END " +
           "FROM PollaParticipante pp " +
           "WHERE pp.polla.id = :pollaId " +
           "AND pp.emailUsuario = :email " +
           "AND pp.estado = 'ACEPTADO'")
    boolean isUserAceptado(@Param("pollaId") Long pollaId, @Param("email") String email);
}
