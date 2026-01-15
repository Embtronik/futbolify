package com.teamsservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO para enviar notificaciones multicanal al notification-service.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationSendRequest {

    private List<String> channels;
    private String recipient;
    private String recipientPhone;
    private String subject;
    private String body;
    private String serviceOrigin;
}
