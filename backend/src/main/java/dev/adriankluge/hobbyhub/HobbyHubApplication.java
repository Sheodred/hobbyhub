package dev.adriankluge.hobbyhub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class HobbyHubApplication {

    public static void main(String[] args) {
        SpringApplication.run(HobbyHubApplication.class, args);
    }
}
