package com.teamsservice.config;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
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
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

/**
 * Configuración de Jackson para asegurar que todas las fechas se manejen correctamente
 * en formato ISO 8601 con 'Z' (UTC).
 * 
 * IMPORTANTE: 
 * - Todos los LocalDateTime en la BD se asumen en UTC
 * - Al serializar (enviar al frontend), se agrega 'Z' explícitamente
 * - Al deserializar (recibir del frontend), se interpreta como UTC
 * 
 * Esto garantiza consistencia entre servidor, BD y frontend.
 */
@Configuration
public class JacksonConfig {

    /**
     * Serializador personalizado para LocalDateTime que:
     * 1. Asume que el LocalDateTime está en UTC
     * 2. Lo serializa en formato ISO 8601 con 'Z' al final
     * Ejemplo salida: "2024-01-28T19:30:00Z"
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

    /**
     * Deserializador personalizado para LocalDateTime que:
     * 1. Acepta fechas con 'Z' (UTC) o sin zona horaria
     * 2. Si no tiene 'Z', asume UTC
     * 3. Convierte a LocalDateTime en UTC
     * 
     * Formatos aceptados:
     * - "2024-01-28T19:30:00Z" (ISO 8601 con Z)
     * - "2024-01-28T19:30:00" (sin Z, asume UTC)
     * - "2024-01-28T19:30:00.123Z" (con milisegundos)
     */
    public static class LocalDateTimeUtcDeserializer extends JsonDeserializer<LocalDateTime> {
        
        @Override
        public LocalDateTime deserialize(JsonParser parser, DeserializationContext context) 
                throws IOException {
            String dateString = parser.getText();
            
            if (dateString == null || dateString.isBlank()) {
                return null;
            }
            
            try {
                // Si tiene 'Z' al final, parsear como Instant y convertir a LocalDateTime UTC
                if (dateString.endsWith("Z")) {
                    Instant instant = Instant.parse(dateString);
                    return LocalDateTime.ofInstant(instant, ZoneOffset.UTC);
                }
                
                // Si no tiene 'Z', asumir que ya es UTC
                return LocalDateTime.parse(dateString);
                
            } catch (DateTimeParseException e) {
                throw new IOException("Error parsing date: " + dateString + 
                    ". Expected format: yyyy-MM-dd'T'HH:mm:ss'Z' or yyyy-MM-dd'T'HH:mm:ss", e);
            }
        }
    }

    @Bean
    @Primary
    public ObjectMapper objectMapper(Jackson2ObjectMapperBuilder builder) {
        ObjectMapper objectMapper = builder.build();
        
        // Registrar módulo de Java Time (java.time.*)
        objectMapper.registerModule(new JavaTimeModule());
        
        // Registrar serializador y deserializador personalizados para LocalDateTime
        SimpleModule customModule = new SimpleModule();
        customModule.addSerializer(LocalDateTime.class, new LocalDateTimeUtcSerializer());
        customModule.addDeserializer(LocalDateTime.class, new LocalDateTimeUtcDeserializer());
        objectMapper.registerModule(customModule);
        
        // Deshabilitar timestamps numéricos (usar ISO 8601 en su lugar)
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        
        return objectMapper;
    }
}
