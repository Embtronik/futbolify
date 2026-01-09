package com.teamsservice.repository;

import com.teamsservice.entity.PollaPartido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PollaPartidoRepository extends JpaRepository<PollaPartido, Long> {

    /**
     * Encuentra todos los partidos de una polla
     */
    List<PollaPartido> findByPollaIdOrderByFechaHoraPartidoAsc(Long pollaId);

    /**
     * Verifica si un partido externo ya fue agregado a la polla
     */
    boolean existsByPollaIdAndIdPartidoExterno(Long pollaId, String idPartidoExterno);

    /**
     * Encuentra partido específico en una polla
     */
    Optional<PollaPartido> findByIdAndPollaId(Long partidoId, Long pollaId);

    /**
     * Cuenta partidos finalizados en una polla
     */
    @Query("SELECT COUNT(pp) FROM PollaPartido pp " +
           "WHERE pp.polla.id = :pollaId " +
           "AND pp.partidoFinalizado = true")
    long countFinalizadosByPollaId(@Param("pollaId") Long pollaId);

    /**
     * Encuentra partidos próximos a iniciarse (útil para bloquear pronósticos)
     */
    @Query("SELECT pp FROM PollaPartido pp " +
           "WHERE pp.polla.id = :pollaId " +
           "AND pp.fechaLimitePronostico <= CURRENT_TIMESTAMP " +
           "AND pp.partidoFinalizado = false")
    List<PollaPartido> findPartidosPorCerrar(@Param("pollaId") Long pollaId);
}
