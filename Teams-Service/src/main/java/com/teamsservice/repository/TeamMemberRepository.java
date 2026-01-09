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
    
    // Contar miembros aprobados de un equipo
    long countByTeamIdAndStatus(Long teamId, MembershipStatus status);
    
    // Verificar si un usuario (por email) es miembro aprobado de un equipo
    boolean existsByTeamIdAndUserEmailAndStatus(Long teamId, String userEmail, MembershipStatus status);
}
