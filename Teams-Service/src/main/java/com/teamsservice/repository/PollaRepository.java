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
     * Encuentra todas las pollas donde un usuario es participante y su estado es ACEPTADO o INVITADO
     */
    @Query("SELECT DISTINCT p FROM Polla p " +
           "JOIN p.participantes pp " +
           "WHERE pp.emailUsuario = :email " +
           "AND pp.estado IN ('ACEPTADO', 'INVITADO') " +
           "AND p.deletedAt IS NULL " +
           "ORDER BY p.createdAt DESC")
    List<Polla> findPollasWhereUserIsParticipant(@Param("email") String email);

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
}
