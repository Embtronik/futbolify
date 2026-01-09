package com.teamsservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApproveMemberRequest {

    @NotNull(message = "Approved status is required")
    private Boolean approved; // true = aprobar, false = rechazar
}
