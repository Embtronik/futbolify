package com.payment.service.repository;

import com.payment.service.domain.PaymentStatus;
import com.payment.service.domain.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, UUID> {

    Optional<PaymentTransaction> findByReference(String reference);

    boolean existsByReference(String reference);

    boolean existsByCustomerEmailIgnoreCaseAndPollaIdAndStatus(String customerEmail, Long pollaId, PaymentStatus status);
}
