package com.authservice.repository;

import com.authservice.model.UserTermsAcceptance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserTermsAcceptanceRepository extends JpaRepository<UserTermsAcceptance, Long> {
    boolean existsByUserIdAndTermsVersion(Long userId, String termsVersion);
    Optional<UserTermsAcceptance> findFirstByUserIdOrderByAcceptedAtDesc(Long userId);
}
