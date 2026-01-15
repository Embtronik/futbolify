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
public class TeamMatchResponse {

    private Long id;
    private Long teamId;
    private String teamName;
    private String address;
    private Double latitude;
    private Double longitude;
    private String placeId;
    private LocalDateTime matchDateTime;
    private LocalDateTime createdAt;
}
