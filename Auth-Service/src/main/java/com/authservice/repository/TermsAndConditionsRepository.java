package com.authservice.repository;

import com.authservice.model.TermsAndConditions;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TermsAndConditionsRepository extends JpaRepository<TermsAndConditions, Long> {
    Optional<TermsAndConditions> findByVersion(String version);
    Optional<TermsAndConditions> findFirstByActiveTrueOrderByPublishedAtDesc();
    boolean existsByVersion(String version);
}
