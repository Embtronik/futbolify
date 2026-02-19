package com.payment.service.exception;

public class DuplicatePaymentReferenceException extends RuntimeException {

    public DuplicatePaymentReferenceException(String reference) {
        super("Ya existe un pago con la referencia: " + reference);
    }
}
