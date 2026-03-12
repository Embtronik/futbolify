package com.teamsservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class TeamsServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(TeamsServiceApplication.class, args);
    }
}
