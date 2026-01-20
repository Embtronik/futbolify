package com.teamsservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchAttendanceSummaryResponse {

    private long attendingCount;
    private long notAttendingCount;
    private long pendingCount;

    private List<TeamMatchAttendanceResponse> attending;
    private List<TeamMatchAttendanceResponse> notAttending;
    private List<TeamMatchAttendanceResponse> pending;
}
