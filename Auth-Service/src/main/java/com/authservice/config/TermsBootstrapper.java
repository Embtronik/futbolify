package com.authservice.config;

import com.authservice.model.TermsAndConditions;
import com.authservice.repository.TermsAndConditionsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class TermsBootstrapper implements CommandLineRunner {

    private final TermsAndConditionsRepository termsRepository;
    private final ResourceLoader resourceLoader;

    @Value("${app.terms.default-version:v1}")
    private String defaultVersion;

    @Value("${app.terms.default-resource:classpath:terms/default.md}")
    private String defaultResource;

    @Override
    public void run(String... args) {
        // If there is already an active terms record, do nothing.
        if (termsRepository.findFirstByActiveTrueOrderByPublishedAtDesc().isPresent()) {
            return;
        }

        TermsAndConditions terms = termsRepository.findByVersion(defaultVersion)
                .orElseGet(() -> TermsAndConditions.builder()
                        .version(defaultVersion)
                        .content(loadDefaultContent())
                        .publishedAt(LocalDateTime.now())
                        .active(true)
                        .build());

        terms.setActive(true);
        if (terms.getPublishedAt() == null) {
            terms.setPublishedAt(LocalDateTime.now());
        }

        termsRepository.save(terms);
    }

    private String loadDefaultContent() {
        try {
            Resource resource = resourceLoader.getResource(defaultResource);
            if (resource.exists()) {
                return StreamUtils.copyToString(resource.getInputStream(), StandardCharsets.UTF_8);
            }
        } catch (Exception ignored) {
        }
        return "Términos y Condiciones\n\n(Pendiente de configurar el texto oficial.)\n";
    }
}
