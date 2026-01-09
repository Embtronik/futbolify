package com.authservice.dto.notification;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationRequest {
    private List<String> channels;
    private String recipient;
    private String recipientPhone;
    private String subject;
    private String body;
    private String serviceOrigin;
    
    // Para soporte de templates
    private String templateType;
    private Map<String, Object> variables;
}
