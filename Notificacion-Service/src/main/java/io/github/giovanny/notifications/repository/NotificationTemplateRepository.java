package io.github.giovanny.notifications.repository;

import io.github.giovanny.notifications.domain.entity.NotificationTemplate;
import io.github.giovanny.notifications.domain.enums.Channel;
import io.github.giovanny.notifications.domain.enums.TemplateType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificationTemplateRepository extends JpaRepository<NotificationTemplate, UUID> {
    
    /**
     * Busca un template activo por tipo y canal.
     * 
     * @param templateType Tipo de template
     * @param channel Canal de comunicación
     * @return Template encontrado o Optional.empty()
     */
    Optional<NotificationTemplate> findByTemplateTypeAndChannelAndIsActiveTrue(
            TemplateType templateType, 
            Channel channel
    );
    
    /**
     * Lista todos los templates activos de un canal específico.
     * 
     * @param channel Canal de comunicación
     * @return Lista de templates activos
     */
    List<NotificationTemplate> findByChannelAndIsActiveTrueOrderByNameAsc(Channel channel);
    
    /**
     * Lista todos los templates de un tipo específico (activos e inactivos).
     * 
     * @param templateType Tipo de template
     * @return Lista de templates
     */
    List<NotificationTemplate> findByTemplateTypeOrderByVersionDesc(TemplateType templateType);
    
    /**
     * Busca templates por nombre (búsqueda parcial).
     * 
     * @param name Nombre o parte del nombre
     * @return Lista de templates que coinciden
     */
    @Query("SELECT t FROM NotificationTemplate t WHERE LOWER(t.name) LIKE LOWER(CONCAT('%', :name, '%')) AND t.isActive = true")
    List<NotificationTemplate> searchByName(@Param("name") String name);
    
    /**
     * Cuenta cuántos templates activos existen para un tipo y canal específico.
     * 
     * @param templateType Tipo de template
     * @param channel Canal de comunicación
     * @return Cantidad de templates activos
     */
    long countByTemplateTypeAndChannelAndIsActiveTrue(TemplateType templateType, Channel channel);
}
