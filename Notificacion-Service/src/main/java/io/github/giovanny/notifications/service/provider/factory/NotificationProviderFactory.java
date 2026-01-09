package io.github.giovanny.notifications.service.provider.factory;

import io.github.giovanny.notifications.domain.enums.Channel;
import io.github.giovanny.notifications.exception.ProviderNotConfiguredException;
import io.github.giovanny.notifications.service.provider.NotificationProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationProviderFactory {
    
    private final List<NotificationProvider> providers;
    private Map<Channel, NotificationProvider> providerMap;
    
    private void initializeProviderMap() {
        if (providerMap == null) {
            providerMap = providers.stream()
                    .collect(Collectors.toMap(
                            provider -> {
                                for (Channel channel : Channel.values()) {
                                    if (provider.supports(channel)) {
                                        return channel;
                                    }
                                }
                                throw new IllegalStateException(
                                        "Provider " + provider.getProviderName() + " does not support any channel");
                            },
                            Function.identity(),
                            (existing, replacement) -> {
                                log.warn("Multiple providers found for same channel. Using: {}", 
                                        existing.getProviderName());
                                return existing;
                            }
                    ));
            
            log.info("Initialized provider map with {} providers", providerMap.size());
            providerMap.forEach((channel, provider) -> 
                    log.info("Channel {} -> Provider {}", channel, provider.getProviderName()));
        }
    }
    
    public NotificationProvider getProvider(Channel channel) {
        initializeProviderMap();
        
        NotificationProvider provider = providerMap.get(channel);
        
        if (provider == null) {
            throw new ProviderNotConfiguredException(
                    "No provider configured for channel: " + channel + 
                    ". Please configure the appropriate provider in application.yml");
        }
        
        return provider;
    }
}
