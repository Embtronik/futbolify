package com.teamsservice.service;

import com.teamsservice.dto.UserInfoDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientException;

/**
 * Servicio para comunicarse con el auth-service y obtener información de usuarios
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceClient {

    private final RestTemplate restTemplate;
    
    @Value("${app.auth-service.url:http://localhost:8080}")
    private String authServiceUrl;

    /**
     * Obtiene información de un usuario por su email
     * @param email Email del usuario
     * @return UserInfoDto con la información del usuario, o null si no se encuentra
     */
    public UserInfoDto getUserByEmail(String email) {
        try {
            String url = authServiceUrl + "/api/v1/user/by-email?email=" + email;
            log.info("Fetching user info from auth-service: {}", url);
            
            UserInfoDto userInfo = restTemplate.getForObject(url, UserInfoDto.class);
            log.info("User info retrieved successfully for email {}: {}", email, userInfo != null ? userInfo.getFirstName() + " " + userInfo.getLastName() : "null");
            
            return userInfo;
        } catch (RestClientException e) {
            log.error("Error fetching user info from auth-service for email {}: {}", email, e.getMessage());
            log.error("Auth service URL configured: {}", authServiceUrl);
            log.error("Full exception: ", e);
            return null;
        }
    }

    /**
     * Obtiene información de un usuario por su ID
     * @param userId ID del usuario
     * @return UserInfoDto con la información del usuario, o null si no se encuentra
     */
    public UserInfoDto getUserById(Long userId) {
        try {
            String url = authServiceUrl + "/api/v1/user/" + userId;
            log.info("Fetching user info from auth-service: {}", url);
            
            UserInfoDto userInfo = restTemplate.getForObject(url, UserInfoDto.class);
            log.debug("User info retrieved: {}", userInfo);
            
            return userInfo;
        } catch (RestClientException e) {
            log.error("Error fetching user info from auth-service for userId {}: {}", userId, e.getMessage());
            return null;
        }
    }
}
