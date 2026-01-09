package com.teamsservice.service;

import com.teamsservice.dto.TeamEventDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class RabbitMQService {

    private final RabbitTemplate rabbitTemplate;

    @Value("${app.rabbitmq.exchange}")
    private String exchange;

    @Value("${app.rabbitmq.routing-key.team-created}")
    private String teamCreatedRoutingKey;

    @Value("${app.rabbitmq.routing-key.team-updated}")
    private String teamUpdatedRoutingKey;

    @Value("${app.rabbitmq.routing-key.team-deleted}")
    private String teamDeletedRoutingKey;

    public void publishTeamCreated(TeamEventDto event) {
        try {
            rabbitTemplate.convertAndSend(exchange, teamCreatedRoutingKey, event);
            log.info("Published team created event: {}", event);
        } catch (Exception e) {
            log.error("Error publishing team created event", e);
            // Don't throw - messaging failure shouldn't prevent team creation
        }
    }

    public void publishTeamUpdated(TeamEventDto event) {
        try {
            rabbitTemplate.convertAndSend(exchange, teamUpdatedRoutingKey, event);
            log.info("Published team updated event: {}", event);
        } catch (Exception e) {
            log.error("Error publishing team updated event", e);
        }
    }

    public void publishTeamDeleted(TeamEventDto event) {
        try {
            rabbitTemplate.convertAndSend(exchange, teamDeletedRoutingKey, event);
            log.info("Published team deleted event: {}", event);
        } catch (Exception e) {
            log.error("Error publishing team deleted event", e);
        }
    }
}
