package com.authservice.controller;

import com.authservice.dto.MessageResponse;
import com.authservice.dto.terms.AcceptTermsRequest;
import com.authservice.dto.terms.TermsResponse;
import com.authservice.dto.terms.TermsStatusResponse;
import com.authservice.model.User;
import com.authservice.service.TermsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/terms")
@RequiredArgsConstructor
public class TermsController {

    private final TermsService termsService;

    /** Public endpoint for the frontend to display active terms text. */
    @GetMapping("/active")
    public ResponseEntity<TermsResponse> getActive() {
        return ResponseEntity.ok(termsService.getActiveTerms());
    }

    /** Public endpoint for a specific terms version. */
    @GetMapping("/{version}")
    public ResponseEntity<TermsResponse> getByVersion(@PathVariable String version) {
        return ResponseEntity.ok(termsService.getTermsByVersion(version));
    }

    /** Protected endpoint to check if the current user has accepted active terms. */
    @GetMapping("/me/status")
    public ResponseEntity<TermsStatusResponse> status(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(termsService.getStatus(currentUser.getId()));
    }

    /** Protected endpoint to accept terms (and data processing). */
    @PostMapping("/me/accept")
    public ResponseEntity<MessageResponse> accept(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody AcceptTermsRequest request
    ) {
        termsService.acceptTerms(currentUser, request);
        return ResponseEntity.ok(MessageResponse.builder()
                .success(true)
                .message("Términos aceptados")
                .build());
    }
}
