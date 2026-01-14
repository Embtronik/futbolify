package com.authservice;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class AuthServiceApplication {
    public static void main(String[] args) {
        // Permite usar un archivo .env en local sin exportar variables manualmente.
        // Nota: se cargan como System properties, así Spring puede resolver ${VAR}.
        Dotenv.configure()
                .ignoreIfMissing()
                .systemProperties()
                .load();

        SpringApplication.run(AuthServiceApplication.class, args);
    }
}
