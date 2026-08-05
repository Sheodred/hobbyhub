package dev.adriankluge.hobbyhub.news.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "news_items")
public class NewsItem {

    // Assigned at construction time - see User.java for why.
    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NewsSource source;

    @Column(nullable = false, columnDefinition = "text")
    private String headline;

    @Column(columnDefinition = "text")
    private String teaser;

    @Column(nullable = false, columnDefinition = "text")
    private String url;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "fetched_at", nullable = false)
    private Instant fetchedAt;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    protected NewsItem() {
        // JPA
    }

    public NewsItem(
            NewsSource source, String headline, String teaser, String url, Instant publishedAt, int sortOrder) {
        this.id = UUID.randomUUID();
        this.source = source;
        this.headline = headline;
        this.teaser = teaser;
        this.url = url;
        this.publishedAt = publishedAt;
        this.fetchedAt = Instant.now();
        this.sortOrder = sortOrder;
    }

    public UUID getId() {
        return id;
    }

    public NewsSource getSource() {
        return source;
    }

    public String getHeadline() {
        return headline;
    }

    public String getTeaser() {
        return teaser;
    }

    public String getUrl() {
        return url;
    }

    public Instant getPublishedAt() {
        return publishedAt;
    }

    public Instant getFetchedAt() {
        return fetchedAt;
    }

    public int getSortOrder() {
        return sortOrder;
    }
}
