package com.payment.service.service;

import com.payment.service.domain.PaymentTransaction;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class PaymentEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    @Value("${rabbitmq.exchange}")
    private String exchange;

    public PaymentEventPublisher(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    public void publishPaymentCreated(PaymentTransaction paymentTransaction) {
        Map<String, Object> payload = Map.of(
                "id", paymentTransaction.getId(),
                "reference", paymentTransaction.getReference(),
                "status", paymentTransaction.getStatus().name(),
                "wompiTransactionId", paymentTransaction.getWompiTransactionId() == null ? "" : paymentTransaction.getWompiTransactionId()
        );
        rabbitTemplate.convertAndSend(exchange, "payments.created", payload);
    }
}
