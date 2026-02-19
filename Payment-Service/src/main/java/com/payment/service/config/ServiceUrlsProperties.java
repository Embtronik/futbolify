package com.payment.service.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "services")
public class ServiceUrlsProperties {

    private String authServiceUrl;
    private String notificationServiceUrl;
    private String teamsServiceUrl;

    public String getAuthServiceUrl() {
        return authServiceUrl;
    }

    public void setAuthServiceUrl(String authServiceUrl) {
        this.authServiceUrl = authServiceUrl;
    }

    public String getNotificationServiceUrl() {
        return notificationServiceUrl;
    }

    public void setNotificationServiceUrl(String notificationServiceUrl) {
        this.notificationServiceUrl = notificationServiceUrl;
    }

    public String getTeamsServiceUrl() {
        return teamsServiceUrl;
    }

    public void setTeamsServiceUrl(String teamsServiceUrl) {
        this.teamsServiceUrl = teamsServiceUrl;
    }
}
