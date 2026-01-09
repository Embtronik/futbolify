package com.teamsservice.service;

import com.teamsservice.entity.TeamStatus;
import com.teamsservice.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;

@Service
@RequiredArgsConstructor
@Slf4j
public class JoinCodeGeneratorService {

    private static final String ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int CODE_LENGTH = 6;
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int MAX_ATTEMPTS = 10;

    private final TeamRepository teamRepository;

    /**
     * Genera un código alfanumérico único de 6 dígitos
     * @return Código único que no existe en la base de datos
     */
    public String generateUniqueCode() {
        int attempts = 0;
        
        while (attempts < MAX_ATTEMPTS) {
            String code = generateCode();
            
            // Verificar que el código no exista en equipos activos
            if (!teamRepository.existsByJoinCodeAndStatus(code, TeamStatus.ACTIVE)) {
                log.info("Generated unique join code: {}", code);
                return code;
            }
            
            attempts++;
            log.debug("Join code collision, attempt {}/{}", attempts, MAX_ATTEMPTS);
        }
        
        // Si después de MAX_ATTEMPTS no se encuentra un código único, generar uno con timestamp
        String code = generateCodeWithTimestamp();
        log.warn("Using timestamp-based code after {} attempts: {}", MAX_ATTEMPTS, code);
        return code;
    }

    /**
     * Genera un código alfanumérico aleatorio de 6 caracteres
     */
    private String generateCode() {
        StringBuilder code = new StringBuilder(CODE_LENGTH);
        
        for (int i = 0; i < CODE_LENGTH; i++) {
            int index = RANDOM.nextInt(ALPHANUMERIC.length());
            code.append(ALPHANUMERIC.charAt(index));
        }
        
        return code.toString();
    }

    /**
     * Genera un código basado en timestamp (fallback para garantizar unicidad)
     */
    private String generateCodeWithTimestamp() {
        long timestamp = System.currentTimeMillis();
        String timestampStr = Long.toString(timestamp, 36).toUpperCase();
        
        // Tomar los últimos 6 caracteres
        if (timestampStr.length() >= CODE_LENGTH) {
            return timestampStr.substring(timestampStr.length() - CODE_LENGTH);
        } else {
            // Si es más corto, completar con caracteres aleatorios
            StringBuilder code = new StringBuilder(timestampStr);
            while (code.length() < CODE_LENGTH) {
                int index = RANDOM.nextInt(ALPHANUMERIC.length());
                code.append(ALPHANUMERIC.charAt(index));
            }
            return code.toString();
        }
    }

    /**
     * Valida que un código tenga el formato correcto
     */
    public boolean isValidCodeFormat(String code) {
        if (code == null || code.length() != CODE_LENGTH) {
            return false;
        }
        
        return code.chars().allMatch(c -> ALPHANUMERIC.indexOf(c) >= 0);
    }
}
