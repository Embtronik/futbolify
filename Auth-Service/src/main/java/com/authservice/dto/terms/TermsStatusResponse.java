package com.authservice.dto.terms;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TermsStatusResponse {
    private boolean accepted;
    private String requiredTermsVersion;
    private String acceptedTermsVersion;
}
