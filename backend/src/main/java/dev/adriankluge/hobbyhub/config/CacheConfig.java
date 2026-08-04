package dev.adriankluge.hobbyhub.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

// Short-TTL cache for Scryfall responses (see docs/adr/0003) - cuts real
// Scryfall traffic for repeated queries and insulates the app from brief
// Scryfall outages on already-seen requests.
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CaffeineCacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager("scryfallSearch", "scryfallCard");
        manager.setCaffeine(Caffeine.newBuilder().expireAfterWrite(Duration.ofMinutes(5)).maximumSize(500));
        return manager;
    }
}
