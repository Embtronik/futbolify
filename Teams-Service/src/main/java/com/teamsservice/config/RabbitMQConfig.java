package com.teamsservice.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    @Value("${app.rabbitmq.exchange}")
    private String exchange;

    @Value("${app.rabbitmq.routing-key.team-created}")
    private String teamCreatedRoutingKey;

    @Value("${app.rabbitmq.routing-key.team-updated}")
    private String teamUpdatedRoutingKey;

    @Value("${app.rabbitmq.routing-key.team-deleted}")
    private String teamDeletedRoutingKey;

    @Bean
    public TopicExchange teamsExchange() {
        return new TopicExchange(exchange);
    }

    @Bean
    public Queue teamCreatedQueue() {
        return new Queue("team.created.queue", true);
    }

    @Bean
    public Queue teamUpdatedQueue() {
        return new Queue("team.updated.queue", true);
    }

    @Bean
    public Queue teamDeletedQueue() {
        return new Queue("team.deleted.queue", true);
    }

    @Bean
    public Binding teamCreatedBinding(Queue teamCreatedQueue, TopicExchange teamsExchange) {
        return BindingBuilder.bind(teamCreatedQueue).to(teamsExchange).with(teamCreatedRoutingKey);
    }

    @Bean
    public Binding teamUpdatedBinding(Queue teamUpdatedQueue, TopicExchange teamsExchange) {
        return BindingBuilder.bind(teamUpdatedQueue).to(teamsExchange).with(teamUpdatedRoutingKey);
    }

    @Bean
    public Binding teamDeletedBinding(Queue teamDeletedQueue, TopicExchange teamsExchange) {
        return BindingBuilder.bind(teamDeletedQueue).to(teamsExchange).with(teamDeletedRoutingKey);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jsonMessageConverter());
        return template;
    }
}
