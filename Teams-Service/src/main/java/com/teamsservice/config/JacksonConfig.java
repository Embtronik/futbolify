package com.teamsservice.config;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

/**
 * Configuración de Jackson para asegurar que todas las fechas se serialicen correctamente
 * en formato ISO 8601 con 'Z' (UTC).
 * 
 * IMPORTANTE: Asumimos que todos los LocalDateTime en la BD están en UTC.
 * Al serializar, agregamos explícitamente 'Z' al final para que el frontend
 * sepa que es UTC y pueda convertir a la zona horaria local del usuario.
 */
@Configuration
public class JacksonConfig {

    /**
     * Serializador personalizado para LocalDateTime que:
     * 1. Asume que el LocalDateTime está en UTC
     * 2. Lo serializa en formato ISO 8601 con 'Z' al final
     * Ejemplo: "2024-01-28T19:30:00Z"
     */
    public static class LocalDateTimeUtcSerializer extends JsonSerializer<LocalDateTime> {
        private static final DateTimeFormatter FORMATTER = DateTimeFormatter
                .ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'");

        @Override
        public void serialize(LocalDateTime value, JsonGenerator gen, SerializerProvider serializers) 
                throws IOException {
            if (value == null) {
                gen.writeNull();
                return;
            }
            
            // Convertir LocalDateTime a Instant asumiendo UTC, luego serializar
            String formatted = value.atOffset(ZoneOffset.UTC).format(FORMATTER);
            gen.writeString(formatted);
        }
    }

    @Bean
    @Primary
    public ObjectMapper objectMapper(Jackson2ObjectMapperBuilder builder) {
        ObjectMapper objectMapper = builder.build();
        
        // Registrar módulo de Java Time (java.time.*)
        objectMapper.registerModule(new JavaTimeModule());
        
        // Registrar serializador personalizado para LocalDateTime
        SimpleModule customModule = new SimpleModule();
        customModule.addSerializer(LocalDateTime.class, new LocalDateTimeUtcSerializer());
        objectMapper.registerModule(customModule);
        
        // Deshabilitar timestamps numéricos (usar ISO 8601 en su lugar)
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        
        return objectMapper;
    }
}
