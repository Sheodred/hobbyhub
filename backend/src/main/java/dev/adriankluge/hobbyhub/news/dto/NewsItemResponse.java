package dev.adriankluge.hobbyhub.news.dto;

import dev.adriankluge.hobbyhub.news.entity.NewsItem;
import java.time.Instant;

public record NewsItemResponse(String headline, String teaser, String url, Instant publishedAt) {

    public static NewsItemResponse from(NewsItem item) {
        return new NewsItemResponse(item.getHeadline(), item.getTeaser(), item.getUrl(), item.getPublishedAt());
    }
}
