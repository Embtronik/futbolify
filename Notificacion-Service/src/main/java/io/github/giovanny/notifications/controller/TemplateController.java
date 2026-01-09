package io.github.giovanny.notifications.controller;

import io.github.giovanny.notifications.domain.entity.NotificationTemplate;
import io.github.giovanny.notifications.domain.enums.Channel;
import io.github.giovanny.notifications.service.TemplateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Controlador REST para administración de templates de notificación.
 * Permite crear, consultar y desactivar templates.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/templates")
@RequiredArgsConstructor
public class TemplateController {
    
    private final TemplateService templateService;
    
    /**
     * Lista todos los templates activos de un canal específico.
     * 
     * @param channel Canal de comunicación
     * @return Lista de templates
     */
    @GetMapping("/channel/{channel}")
    public ResponseEntity<List<NotificationTemplate>> getTemplatesByChannel(
            @PathVariable Channel channel
    ) {
        log.info("Fetching active templates for channel: {}", channel);
        List<NotificationTemplate> templates = templateService.getActiveTemplatesByChannel(channel);
        return ResponseEntity.ok(templates);
    }
    
    /**
     * Obtiene un template específico por su ID.
     * 
     * @param id ID del template
     * @return Template encontrado
     */
    @GetMapping("/{id}")
    public ResponseEntity<NotificationTemplate> getTemplateById(@PathVariable UUID id) {
        log.info("Fetching template by id: {}", id);
        
        return templateService.getTemplateById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    /**
     * Crea un nuevo template.
     * 
     * @param template Template a crear
     * @return Template creado
     */
    @PostMapping
    public ResponseEntity<NotificationTemplate> createTemplate(
            @RequestBody NotificationTemplate template
    ) {
        log.info("Creating new template: type={}, channel={}, name={}", 
                template.getTemplateType(), template.getChannel(), template.getName());
        
        NotificationTemplate saved = templateService.saveTemplate(template);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }
    
    /**
     * Actualiza un template existente.
     * 
     * @param id ID del template a actualizar
     * @param template Datos actualizados
     * @return Template actualizado
     */
    @PutMapping("/{id}")
    public ResponseEntity<NotificationTemplate> updateTemplate(
            @PathVariable UUID id,
            @RequestBody NotificationTemplate template
    ) {
        log.info("Updating template: id={}", id);
        
        return templateService.getTemplateById(id)
                .map(existing -> {
                    template.setId(id);
                    template.setCreatedAt(existing.getCreatedAt());
                    template.setCreatedBy(existing.getCreatedBy());
                    NotificationTemplate updated = templateService.saveTemplate(template);
                    return ResponseEntity.ok(updated);
                })
                .orElse(ResponseEntity.notFound().build());
    }
    
    /**
     * Desactiva un template (soft delete).
     * 
     * @param id ID del template a desactivar
     * @return Respuesta sin contenido
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateTemplate(@PathVariable UUID id) {
        log.info("Deactivating template: id={}", id);
        templateService.deactivateTemplate(id);
        return ResponseEntity.noContent().build();
    }
}
