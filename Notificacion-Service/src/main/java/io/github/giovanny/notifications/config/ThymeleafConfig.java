package io.github.giovanny.notifications.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.StringTemplateResolver;

/**
 * Configuración de Thymeleaf para procesar templates inline (strings) y archivos.
 * El StringTemplateResolver permite procesar HTML directamente desde strings
 * almacenados en la base de datos, sin necesidad de archivos físicos.
 * 
 * Usa @Primary para sobrescribir el TemplateEngine por defecto de Spring Boot.
 */
@Configuration
public class ThymeleafConfig {

    @Bean
    @Primary  // Sobrescribe el TemplateEngine por defecto de Spring Boot
    public SpringTemplateEngine templateEngine() {
        SpringTemplateEngine engine = new SpringTemplateEngine();
        
        // StringTemplateResolver para procesar templates desde strings (DB)
        StringTemplateResolver stringResolver = new StringTemplateResolver();
        stringResolver.setTemplateMode(TemplateMode.HTML);
        stringResolver.setOrder(1); // Primera prioridad
        stringResolver.setCacheable(false); // Deshabilitar cache en dev (cambiar a true en prod)
        
        engine.addTemplateResolver(stringResolver);
        
        return engine;
    }
}
