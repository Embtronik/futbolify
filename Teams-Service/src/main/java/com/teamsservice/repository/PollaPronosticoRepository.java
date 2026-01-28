package com.teamsservice.repository;

import com.teamsservice.entity.PollaPronostico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PollaPronosticoRepository extends JpaRepository<PollaPronostico, Long> {

    /**
     * Encuentra todos los pronósticos de un partido
     */
    List<PollaPronostico> findByPollaPartidoId(Long pollaPartidoId);

    /**
     * Encuentra pronóstico específico de un participante en un partido
     */
    Optional<PollaPronostico> findByPollaPartidoIdAndEmailParticipante(
        Long pollaPartidoId, 
        String emailParticipante
    );

    /**
     * Encuentra todos los pronósticos de un participante en una polla
     */
    @Query("SELECT pr FROM PollaPronostico pr " +
           "WHERE pr.pollaPartido.polla.id = :pollaId " +
           "AND pr.emailParticipante = :email " +
           "ORDER BY pr.pollaPartido.fechaHoraPartido ASC")
    List<PollaPronostico> findByPollaIdAndEmail(
        @Param("pollaId") Long pollaId, 
        @Param("email") String email
    );

    /**
     * Calcula tabla de posiciones (suma de puntos por participante)
     */
    @Query("SELECT pr.emailParticipante, SUM(pr.puntosObtenidos) " +
           "FROM PollaPronostico pr " +
           "WHERE pr.pollaPartido.polla.id = :pollaId " +
           "AND pr.puntosObtenidos IS NOT NULL " +
           "GROUP BY pr.emailParticipante " +
           "ORDER BY SUM(pr.puntosObtenidos) DESC")
    List<Object[]> findTablaPosiciones(@Param("pollaId") Long pollaId);

    /**
     * Verifica si el participante ya pronosticó el partido
     */
    boolean existsByPollaPartidoIdAndEmailParticipante(Long pollaPartidoId, String email);

    /**
     * Encuentra todos los pronósticos de una polla (todos los participantes, todos los partidos)
     */
    @Query("SELECT pr FROM PollaPronostico pr " +
           "WHERE pr.pollaPartido.polla.id = :pollaId " +
           "ORDER BY pr.emailParticipante, pr.pollaPartido.fechaHoraPartido ASC")
    List<PollaPronostico> findByPollaPartidoPollaId(@Param("pollaId") Long pollaId);
}
