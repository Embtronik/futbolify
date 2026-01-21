package com.teamsservice.config;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class ApiFootballConfig {

    @Bean(name = "apiFootballRestTemplate")
    public RestTemplate apiFootballRestTemplate(RestTemplateBuilder builder) {
        // Important: do NOT include JwtForwardingInterceptor (external service).
        return builder.build();
    }
}
