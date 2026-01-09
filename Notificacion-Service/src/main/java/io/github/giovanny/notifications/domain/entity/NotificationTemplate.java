package io.github.giovanny.notifications.domain.entity;

import io.github.giovanny.notifications.domain.enums.Channel;
import io.github.giovanny.notifications.domain.enums.TemplateType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entidad que representa una plantilla de notificación en el sistema.
 * Permite gestionar diferentes versiones de templates para cada canal de comunicación.
 */
@Entity
@Table(name = "notification_template", indexes = {
        @Index(name = "idx_template_type_channel", columnList = "template_type,channel"),
        @Index(name = "idx_template_active", columnList = "is_active")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationTemplate {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "template_type", nullable = false, length = 50)
    private TemplateType templateType;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Channel channel;
    
    @Column(nullable = false, length = 200)
    private String name;
    
    @Column(length = 500)
    private String description;
    
    /**
     * Subject/título del template (para emails principalmente).
     * Puede contener variables: "Bienvenido {{userName}}"
     */
    @Column(length = 500)
    private String subject;
    
    /**
     * Contenido del template.
     * Para EMAIL: puede ser HTML o texto plano con variables Thymeleaf
     * Para SMS/WhatsApp: texto plano con variables: "Hola {{userName}}, tu código es {{code}}"
     */
    @Column(columnDefinition = "TEXT", nullable = false)
    private String body;
    
    /**
     * Variables esperadas en formato JSON.
     * Ejemplo: ["userName", "activationLink", "expirationDate"]
     */
    @Column(columnDefinition = "TEXT")
    private String expectedVariables;
    
    /**
     * Indica si el template está activo y puede ser utilizado.
     * Los templates inactivos no pueden ser seleccionados para envío.
     */
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
    
    /**
     * Versión del template para control de cambios.
     */
    @Column(nullable = false)
    @Builder.Default
    private Integer version = 1;
    
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    @Column(name = "created_by", length = 100)
    private String createdBy;
    
    @Column(name = "updated_by", length = 100)
    private String updatedBy;
    
    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
