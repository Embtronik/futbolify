package com.teamsservice.repository;

import com.teamsservice.entity.PollaPuntajePartido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PollaPuntajePartidoRepository extends JpaRepository<PollaPuntajePartido, Long> {

    boolean existsByPollaPartidoIdAndEmailParticipante(Long pollaPartidoId, String emailParticipante);

    Optional<PollaPuntajePartido> findByPollaPartidoIdAndEmailParticipante(Long pollaPartidoId, String emailParticipante);

    List<PollaPuntajePartido> findByPollaPartidoId(Long pollaPartidoId);

    @Query("SELECT pp.emailParticipante, SUM(pp.puntos) " +
           "FROM PollaPuntajePartido pp " +
           "WHERE pp.pollaPartido.polla.id = :pollaId " +
           "AND pp.definitivo = true " +
           "GROUP BY pp.emailParticipante " +
           "ORDER BY SUM(pp.puntos) DESC")
    List<Object[]> findTablaPosicionesDefinitiva(@Param("pollaId") Long pollaId);
}
