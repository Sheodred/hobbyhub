package dev.adriankluge.hobbyhub.marketplace.entity;

import dev.adriankluge.hobbyhub.auth.entity.User;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "listings")
public class Listing {

    // Assigned at construction time - see User.java for why.
    @Id
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "seller_id", nullable = false)
    private User seller;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ListingCategory category;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(nullable = false)
    private String condition;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ListingStatus status;

    // EAGER (not the @ElementCollection default of LAZY) - open-in-view is
    // disabled, so a lazy collection can't be initialized once the response
    // DTO is serialized outside the request's transaction; every read path
    // needs this immediately anyway, so eager is also just the right fetch
    // strategy here, not merely a workaround.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "listing_images", joinColumns = @JoinColumn(name = "listing_id"))
    @OrderColumn(name = "sort_order")
    @Column(name = "url")
    private List<String> imageUrls = new ArrayList<>();

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Listing() {
        // JPA
    }

    public Listing(
            User seller, String title, String description, ListingCategory category, BigDecimal price, String condition) {
        this.id = UUID.randomUUID();
        this.seller = seller;
        this.title = title;
        this.description = description;
        this.category = category;
        this.price = price;
        this.condition = condition;
        this.status = ListingStatus.ACTIVE;
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    public boolean isOwnedBy(UUID userId) {
        return seller.getId().equals(userId);
    }

    public void update(
            String title, String description, ListingCategory category, BigDecimal price, String condition,
            ListingStatus status, List<String> imageUrls) {
        this.title = title;
        this.description = description;
        this.category = category;
        this.price = price;
        this.condition = condition;
        this.status = status;
        this.imageUrls = new ArrayList<>(imageUrls);
        this.updatedAt = Instant.now();
    }

    public void remove() {
        this.status = ListingStatus.REMOVED;
        this.updatedAt = Instant.now();
    }

    public void setImageUrls(List<String> imageUrls) {
        this.imageUrls = new ArrayList<>(imageUrls);
    }

    public UUID getId() {
        return id;
    }

    public User getSeller() {
        return seller;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public ListingCategory getCategory() {
        return category;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public String getCondition() {
        return condition;
    }

    public ListingStatus getStatus() {
        return status;
    }

    public List<String> getImageUrls() {
        return imageUrls;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
