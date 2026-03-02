package com.teamsservice.repository;

import com.teamsservice.entity.TeamMember;
import com.teamsservice.entity.TeamMember.MembershipStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeamMemberRepository extends JpaRepository<TeamMember, Long> {
    
    // Verificar si un usuario ya tiene una solicitud para un equipo
    boolean existsByTeamIdAndUserId(Long teamId, Long userId);
    
    // Obtener la membresía de un usuario en un equipo
    Optional<TeamMember> findByTeamIdAndUserId(Long teamId, Long userId);
    
    // Obtener todas las solicitudes pendientes de un equipo
    List<TeamMember> findByTeamIdAndStatus(Long teamId, MembershipStatus status);
    
    // Obtener todos los miembros aprobados de un equipo
    @Query("SELECT tm FROM TeamMember tm WHERE tm.team.id = :teamId AND tm.status = 'APPROVED'")
    List<TeamMember> findApprovedMembersByTeamId(@Param("teamId") Long teamId);
    
    // Obtener todos los equipos a los que pertenece un usuario (aprobados)
    @Query("SELECT tm FROM TeamMember tm WHERE tm.userId = :userId AND tm.status = 'APPROVED'")
    List<TeamMember> findApprovedTeamsByUserId(@Param("userId") Long userId);

    // Obtener todos los equipos a los que pertenece un usuario por email (aprobados)
    @Query("SELECT tm FROM TeamMember tm WHERE tm.userEmail = :email AND tm.status = 'APPROVED'")
    List<TeamMember> findApprovedTeamsByUserEmail(@Param("email") String email);
    
    // Contar miembros aprobados de un equipo
    long countByTeamIdAndStatus(Long teamId, MembershipStatus status);
    
    // Verificar si un usuario (por email) es miembro aprobado de un equipo
    boolean existsByTeamIdAndUserEmailAndStatus(Long teamId, String userEmail, MembershipStatus status);

    // Verificar si un usuario (por email) es miembro aprobado de algún grupo asociado a una polla
    @Query("SELECT CASE WHEN COUNT(tm) > 0 THEN true ELSE false END FROM TeamMember tm " +
           "WHERE tm.team.id IN (SELECT t.id FROM Polla p JOIN p.gruposInvitados t WHERE p.id = :pollaId) " +
           "AND tm.userEmail = :email AND tm.status = 'APPROVED'")
    boolean isApprovedMemberOfPollaGroup(@Param("pollaId") Long pollaId, @Param("email") String email);
}
