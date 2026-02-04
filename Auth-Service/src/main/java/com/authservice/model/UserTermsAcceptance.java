package com.authservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "user_terms_acceptance",
        uniqueConstraints = @UniqueConstraint(name = "uk_user_terms_version", columnNames = {"user_id", "terms_version"})
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserTermsAcceptance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "data_processing_accepted", nullable = false)
    private boolean dataProcessingAccepted;

    @Column(name = "accepted_at", nullable = false)
    private LocalDateTime acceptedAt;

    @Column(name = "terms_version", nullable = false, length = 50)
    private String termsVersion;

    @PrePersist
    protected void onCreate() {
        if (acceptedAt == null) {
            acceptedAt = LocalDateTime.now();
        }
    }
}
