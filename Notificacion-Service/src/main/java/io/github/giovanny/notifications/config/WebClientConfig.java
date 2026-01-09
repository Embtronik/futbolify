package io.github.giovanny.notifications.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

/**
 * Configuración de WebClient para comunicación HTTP con servicios externos.
 */
@Configuration
public class WebClientConfig {
    
    @Bean
    public WebClient webClient(AuthServiceProperties authServiceProperties) {
        HttpClient httpClient = HttpClient.create()
                .responseTimeout(Duration.ofMillis(authServiceProperties.getReadTimeout()))
                .option(io.netty.channel.ChannelOption.CONNECT_TIMEOUT_MILLIS, 
                        authServiceProperties.getConnectionTimeout());
        
        return WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .build();
    }
}
