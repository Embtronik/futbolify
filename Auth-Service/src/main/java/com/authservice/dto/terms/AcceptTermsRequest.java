package com.authservice.dto.terms;

import jakarta.validation.constraints.AssertTrue;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AcceptTermsRequest {

    /**
     * The version the user is accepting. If null/blank, the current active version is used.
     */
    private String termsVersion;

    @AssertTrue(message = "Debe aceptar el tratamiento de datos")
    private boolean dataProcessingAccepted;
}
