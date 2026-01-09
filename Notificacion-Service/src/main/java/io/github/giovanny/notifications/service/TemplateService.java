package io.github.giovanny.notifications.service;

import io.github.giovanny.notifications.domain.entity.NotificationTemplate;
import io.github.giovanny.notifications.domain.enums.Channel;
import io.github.giovanny.notifications.domain.enums.TemplateType;
import io.github.giovanny.notifications.exception.NotificationException;
import io.github.giovanny.notifications.repository.NotificationTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Servicio para gestión y renderizado de templates de notificación.
 * Soporta templates dinámicos con variables utilizando Thymeleaf.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TemplateService {
    
    private final NotificationTemplateRepository templateRepository;
    private final TemplateEngine templateEngine;
    
    /**
     * Renderiza un template con las variables proporcionadas.
     * 
     * @param templateType Tipo de template a utilizar
     * @param channel Canal de comunicación
     * @param variables Variables para reemplazar en el template
     * @return Template renderizado con valores reemplazados
     * @throws NotificationException si el template no existe o hay error en renderizado
     */
    @Transactional(readOnly = true)
    public RenderedTemplate renderTemplate(TemplateType templateType, Channel channel, Map<String, Object> variables) {
        log.debug("Rendering template: type={}, channel={}", templateType, channel);
        
        NotificationTemplate template = templateRepository
                .findByTemplateTypeAndChannelAndIsActiveTrue(templateType, channel)
                .orElseThrow(() -> new NotificationException(
                        String.format("No active template found for type=%s and channel=%s", 
                                templateType, channel)
                ));
        
        try {
            String renderedSubject = renderString(template.getSubject(), variables);
            String renderedBody = renderString(template.getBody(), variables);
            
            log.info("Template rendered successfully: id={}, type={}, channel={}", 
                    template.getId(), templateType, channel);
            
            return RenderedTemplate.builder()
                    .templateId(template.getId())
                    .subject(renderedSubject)
                    .body(renderedBody)
                    .build();
            
        } catch (Exception e) {
            log.error("Error rendering template: type={}, channel={}, error={}", 
                    templateType, channel, e.getMessage());
            throw new NotificationException("Failed to render template: " + e.getMessage(), e);
        }
    }
    
    /**
     * Renderiza una cadena de texto con variables usando Thymeleaf.
     * 
     * @param templateString String con variables: "Hola [[${userName}]]"
     * @param variables Mapa de variables
     * @return String renderizado
     */
    private String renderString(String templateString, Map<String, Object> variables) {
        if (templateString == null) {
            return null;
        }
        
        Context context = new Context();
        if (variables != null) {
            variables.forEach(context::setVariable);
        }
        
        // Usar proceso inline de Thymeleaf para renderizar strings
        return templateEngine.process(templateString, context);
    }
    
    /**
     * Obtiene un template por su ID.
     * 
     * @param templateId ID del template
     * @return Template encontrado
     */
    @Transactional(readOnly = true)
    public Optional<NotificationTemplate> getTemplateById(UUID templateId) {
        return templateRepository.findById(templateId);
    }
    
    /**
     * Lista todos los templates activos de un canal.
     * 
     * @param channel Canal de comunicación
     * @return Lista de templates
     */
    @Transactional(readOnly = true)
    public List<NotificationTemplate> getActiveTemplatesByChannel(Channel channel) {
        return templateRepository.findByChannelAndIsActiveTrueOrderByNameAsc(channel);
    }
    
    /**
     * Crea o actualiza un template.
     * 
     * @param template Template a guardar
     * @return Template guardado
     */
    @Transactional
    public NotificationTemplate saveTemplate(NotificationTemplate template) {
        log.info("Saving template: type={}, channel={}, name={}", 
                template.getTemplateType(), template.getChannel(), template.getName());
        
        return templateRepository.save(template);
    }
    
    /**
     * Desactiva un template (soft delete).
     * 
     * @param templateId ID del template a desactivar
     */
    @Transactional
    public void deactivateTemplate(UUID templateId) {
        templateRepository.findById(templateId).ifPresent(template -> {
            template.setIsActive(false);
            templateRepository.save(template);
            log.info("Template deactivated: id={}, type={}", templateId, template.getTemplateType());
        });
    }
    
    /**
     * Resultado de renderizar un template.
     */
    @lombok.Data
    @lombok.Builder
    @lombok.AllArgsConstructor
    @lombok.NoArgsConstructor
    public static class RenderedTemplate {
        private UUID templateId;
        private String subject;
        private String body;
    }
}
