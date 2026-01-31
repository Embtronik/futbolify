package com.teamsservice.service.apifootball;

import com.teamsservice.service.apifootball.ApiFootballModels.FixturesResponse;
import com.teamsservice.service.apifootball.ApiFootballModels.FixtureItem;
import lombok.Getter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.time.OffsetDateTime;

@Component
public class ApiFootballClient {

    private static final Logger log = LoggerFactory.getLogger(ApiFootballClient.class);

    private final RestTemplate restTemplate;

    @Value("${app.football-api.base-url:https://v3.football.api-sports.io}")
    private String baseUrl;

    @Value("${app.football-api.api-key:}")
    private String apiKey;

    public ApiFootballClient(@Qualifier("apiFootballRestTemplate") RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public FixtureSnapshot fetchFixtureById(String fixtureId) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                    "API-Football api key is not configured (set env FOOTBALLAPIKEY or FOOTBALL_API_KEY)");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.set("x-apisports-key", apiKey);

        HttpEntity<Void> entity = new HttpEntity<>(headers);

        String url = baseUrl + "/fixtures?id={id}";

        long startNanos = System.nanoTime();
        ResponseEntity<FixturesResponse> response = restTemplate.exchange(
                url,
                HttpMethod.GET,
                entity,
                FixturesResponse.class,
                fixtureId
        );
        long tookMs = (System.nanoTime() - startNanos) / 1_000_000;

        FixturesResponse body = response.getBody();
        if (body == null || body.getResponse() == null || body.getResponse().isEmpty()) {
            throw new IllegalStateException("API-Football returned empty response for fixture id=" + fixtureId);
        }

        FixtureItem item = body.getResponse().get(0);

        String statusShort = item.getFixture() != null && item.getFixture().getStatus() != null
                ? item.getFixture().getStatus().getShortStatus()
                : null;

        String statusLong = item.getFixture() != null && item.getFixture().getStatus() != null
                ? item.getFixture().getStatus().getLongStatus()
                : null;

        Integer home = item.getGoals() != null ? item.getGoals().getHome() : null;
        Integer away = item.getGoals() != null ? item.getGoals().getAway() : null;

        String remaining = firstHeader(response.getHeaders(),
                "x-ratelimit-requests-remaining",
                "X-RateLimit-Remaining",
                "x-ratelimit-remaining");

        log.info("API-Football fixture={} status={} goals={} - {} took={}ms", fixtureId, statusShort, formatScore(home, away),
                remaining != null ? ("rateRemaining=" + remaining) : "", tookMs);

        // Try to parse fixture date if API provided it
        String fixtureDateStr = item.getFixture() != null ? item.getFixture().getDate() : null;
        Instant fixtureInstant = null;
        if (fixtureDateStr != null && !fixtureDateStr.isBlank()) {
            try {
                fixtureInstant = OffsetDateTime.parse(fixtureDateStr).toInstant();
            } catch (Exception e) {
                try {
                    fixtureInstant = Instant.parse(fixtureDateStr);
                } catch (Exception ex) {
                    log.debug("Could not parse fixture date from API for fixture {}: {}", fixtureId, fixtureDateStr);
                }
            }
        }

        return new FixtureSnapshot(fixtureId, statusShort, statusLong, home, away, Instant.now(), fixtureInstant);
    }

    private static String formatScore(Integer home, Integer away) {
        return (home == null ? "?" : home) + "-" + (away == null ? "?" : away);
    }

    private static String firstHeader(HttpHeaders headers, String... names) {
        if (headers == null) {
            return null;
        }
        for (String name : names) {
            String value = headers.getFirst(name);
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }

    @Getter
    public static class FixtureSnapshot {
        private final String fixtureId;
        private final String statusShort;
        private final String statusLong;
        private final Integer homeGoals;
        private final Integer awayGoals;
        private final Instant fetchedAt;
        private final Instant fixtureDate;

        public FixtureSnapshot(String fixtureId, String statusShort, String statusLong, Integer homeGoals, Integer awayGoals, Instant fetchedAt, Instant fixtureDate) {
            this.fixtureId = fixtureId;
            this.statusShort = statusShort;
            this.statusLong = statusLong;
            this.homeGoals = homeGoals;
            this.awayGoals = awayGoals;
            this.fetchedAt = fetchedAt;
            this.fixtureDate = fixtureDate;
        }

        public Instant getFixtureDate() {
            return fixtureDate;
        }
    }
}
