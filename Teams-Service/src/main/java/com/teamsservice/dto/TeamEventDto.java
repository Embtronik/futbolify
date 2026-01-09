package com.teamsservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamEventDto {

    private Long teamId;
    private String teamName;
    private Long userId;
    private String action; // CREATED, UPDATED, DELETED
    private LocalDateTime timestamp;
}
