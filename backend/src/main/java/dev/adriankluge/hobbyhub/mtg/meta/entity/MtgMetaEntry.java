package dev.adriankluge.hobbyhub.mtg.meta.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "mtg_meta_entries")
public class MtgMetaEntry {

    // Assigned at construction time - see User.java for why.
    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MtgMetaCategory category;

    @Column(nullable = false, columnDefinition = "text")
    private String name;

    @Column(nullable = false, columnDefinition = "text")
    private String url;

    @Column(name = "num_decks")
    private Integer numDecks;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "fetched_at", nullable = false)
    private Instant fetchedAt;

    protected MtgMetaEntry() {
        // JPA
    }

    public MtgMetaEntry(MtgMetaCategory category, String name, String url, Integer numDecks, int sortOrder) {
        this.id = UUID.randomUUID();
        this.category = category;
        this.name = name;
        this.url = url;
        this.numDecks = numDecks;
        this.sortOrder = sortOrder;
        this.fetchedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public MtgMetaCategory getCategory() {
        return category;
    }

    public String getName() {
        return name;
    }

    public String getUrl() {
        return url;
    }

    public Integer getNumDecks() {
        return numDecks;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public Instant getFetchedAt() {
        return fetchedAt;
    }
}
