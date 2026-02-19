package com.payment.service.exception;

public class ExternalPaymentGatewayException extends RuntimeException {

    public ExternalPaymentGatewayException(String message, Throwable cause) {
        super(message, cause);
    }
}
