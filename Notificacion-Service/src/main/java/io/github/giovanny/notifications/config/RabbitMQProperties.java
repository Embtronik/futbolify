package io.github.giovanny.notifications.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

@Getter
@Setter
@Validated
@Configuration
@ConfigurationProperties(prefix = "rabbitmq")
public class RabbitMQProperties {
    
    @NotNull
    private Queue queue = new Queue();
    
    @NotNull
    private Exchange exchange = new Exchange();
    
    @NotBlank
    private String routingKey = "notification.#";
    
    @NotNull
    private Dlq dlq = new Dlq();
    
    @Getter
    @Setter
    public static class Queue {
        @NotBlank
        private String name = "notifications.queue";
        private boolean durable = true;
    }
    
    @Getter
    @Setter
    public static class Exchange {
        @NotBlank
        private String name = "notifications.exchange";
        @NotBlank
        private String type = "topic";
    }
    
    @Getter
    @Setter
    public static class Dlq {
        @NotBlank
        private String name = "notifications.queue.dlq";
    }
}
