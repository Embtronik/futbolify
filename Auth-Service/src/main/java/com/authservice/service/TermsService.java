package com.authservice.service;

import com.authservice.dto.terms.AcceptTermsRequest;
import com.authservice.dto.terms.TermsResponse;
import com.authservice.dto.terms.TermsStatusResponse;
import com.authservice.exception.BadRequestException;
import com.authservice.exception.ResourceNotFoundException;
import com.authservice.model.TermsAndConditions;
import com.authservice.model.User;
import com.authservice.model.UserTermsAcceptance;
import com.authservice.repository.TermsAndConditionsRepository;
import com.authservice.repository.UserTermsAcceptanceRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class TermsService {

    private final TermsAndConditionsRepository termsRepository;
    private final UserTermsAcceptanceRepository acceptanceRepository;

    public TermsAndConditions getActiveTermsEntity() {
        return termsRepository.findFirstByActiveTrueOrderByPublishedAtDesc()
                .orElseThrow(() -> new ResourceNotFoundException("No hay términos activos configurados"));
    }

    public TermsResponse getActiveTerms() {
        TermsAndConditions terms = getActiveTermsEntity();
        return toResponse(terms);
    }

    public TermsResponse getTermsByVersion(String version) {
        TermsAndConditions terms = termsRepository.findByVersion(version)
                .orElseThrow(() -> new ResourceNotFoundException("No se encontraron términos para la versión: " + version));
        return toResponse(terms);
    }

    public TermsStatusResponse getStatus(Long userId) {
        TermsAndConditions active = getActiveTermsEntity();
        var latest = acceptanceRepository.findFirstByUserIdOrderByAcceptedAtDesc(userId);

        boolean acceptedActive = acceptanceRepository.existsByUserIdAndTermsVersion(userId, active.getVersion());

        return TermsStatusResponse.builder()
                .accepted(acceptedActive)
                .requiredTermsVersion(active.getVersion())
                .acceptedTermsVersion(latest.map(UserTermsAcceptance::getTermsVersion).orElse(null))
                .build();
    }

    public boolean hasAcceptedActiveTerms(Long userId) {
        TermsAndConditions active = getActiveTermsEntity();
        return acceptanceRepository.existsByUserIdAndTermsVersion(userId, active.getVersion());
    }

    @Transactional
    public void acceptTerms(User user, AcceptTermsRequest request) {
        if (!request.isDataProcessingAccepted()) {
            throw new BadRequestException("Debe aceptar el tratamiento de datos");
        }

        String version = (request.getTermsVersion() == null || request.getTermsVersion().isBlank())
                ? getActiveTermsEntity().getVersion()
                : request.getTermsVersion().trim();

        // Validate version exists
        termsRepository.findByVersion(version)
                .orElseThrow(() -> new BadRequestException("Versión de términos inválida: " + version));

        if (acceptanceRepository.existsByUserIdAndTermsVersion(user.getId(), version)) {
            return; // idempotent
        }

        UserTermsAcceptance acceptance = UserTermsAcceptance.builder()
                .user(user)
                .dataProcessingAccepted(true)
                .acceptedAt(LocalDateTime.now())
                .termsVersion(version)
                .build();

        acceptanceRepository.save(acceptance);
    }

    private TermsResponse toResponse(TermsAndConditions terms) {
        return TermsResponse.builder()
                .version(terms.getVersion())
                .content(terms.getContent())
                .publishedAt(terms.getPublishedAt())
                .active(terms.isActive())
                .build();
    }
}
