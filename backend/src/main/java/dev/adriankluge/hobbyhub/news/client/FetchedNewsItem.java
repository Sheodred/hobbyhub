package dev.adriankluge.hobbyhub.news.client;

import java.time.Instant;

/** Source-agnostic shape both news clients map their responses into. */
public record FetchedNewsItem(String headline, String teaser, String url, Instant publishedAt) {}
