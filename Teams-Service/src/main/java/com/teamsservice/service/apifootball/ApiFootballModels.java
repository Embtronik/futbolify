package com.teamsservice.service.apifootball;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

public final class ApiFootballModels {

    private ApiFootballModels() {
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class FixturesResponse {
        private List<FixtureItem> response;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class FixtureItem {
        private Fixture fixture;
        private Goals goals;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Fixture {
        private Status status;
        // ISO 8601 date/time provided by API-Football for the fixture (may include offset)
        private String date;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Status {
        @JsonProperty("long")
        private String longStatus;

        @JsonProperty("short")
        private String shortStatus;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Goals {
        private Integer home;
        private Integer away;
    }
}
