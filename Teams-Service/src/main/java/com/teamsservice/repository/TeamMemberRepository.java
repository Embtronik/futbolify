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
        // Obtener todos los miembros de un equipo (cualquier estado)
        List<TeamMember> findByTeamId(Long teamId);
    
    // Verificar si un usuario ya tiene una solicitud para un equipo
    boolean existsByTeamIdAndUserId(Long teamId, Long userId);

    // Verificar si un usuario (por email) ya tiene una solicitud para un equipo (case-insensitive)
    boolean existsByTeamIdAndUserEmailIgnoreCase(Long teamId, String userEmail);
    
    // Obtener la membresía de un usuario en un equipo
    Optional<TeamMember> findByTeamIdAndUserId(Long teamId, Long userId);

    // Obtener la membresía de un usuario en un equipo por email (case-insensitive)
    Optional<TeamMember> findByTeamIdAndUserEmailIgnoreCase(Long teamId, String userEmail);
    
    // Obtener todas las solicitudes pendientes de un equipo
    List<TeamMember> findByTeamIdAndStatus(Long teamId, MembershipStatus status);
    
    // Obtener todos los miembros aprobados de un equipo
    @Query("SELECT tm FROM TeamMember tm WHERE tm.team.id = :teamId AND tm.status = 'APPROVED'")
    List<TeamMember> findApprovedMembersByTeamId(@Param("teamId") Long teamId);
    
    // Obtener todos los equipos a los que pertenece un usuario (aprobados)
    @Query("SELECT tm FROM TeamMember tm WHERE tm.userId = :userId AND tm.status = 'APPROVED'")
    List<TeamMember> findApprovedTeamsByUserId(@Param("userId") Long userId);

    // Obtener todos los equipos a los que pertenece un usuario (aprobados) por email
    @Query("SELECT tm FROM TeamMember tm WHERE lower(tm.userEmail) = lower(:userEmail) AND tm.status = 'APPROVED'")
    List<TeamMember> findApprovedTeamsByUserEmail(@Param("userEmail") String userEmail);
    
    // Contar miembros aprobados de un equipo
    long countByTeamIdAndStatus(Long teamId, MembershipStatus status);
    
    // Verificar si un usuario (por email) es miembro aprobado de un equipo
    boolean existsByTeamIdAndUserEmailAndStatus(Long teamId, String userEmail, MembershipStatus status);
}
