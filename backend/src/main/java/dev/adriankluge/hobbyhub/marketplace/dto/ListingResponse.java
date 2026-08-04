package dev.adriankluge.hobbyhub.marketplace.dto;

import dev.adriankluge.hobbyhub.marketplace.entity.Listing;
import dev.adriankluge.hobbyhub.marketplace.entity.ListingCategory;
import dev.adriankluge.hobbyhub.marketplace.entity.ListingStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ListingResponse(
        UUID id,
        String title,
        String description,
        ListingCategory category,
        BigDecimal price,
        String condition,
        ListingStatus status,
        List<String> imageUrls,
        UUID sellerId,
        String sellerDisplayName,
        Instant createdAt) {

    public static ListingResponse from(Listing listing) {
        return new ListingResponse(
                listing.getId(),
                listing.getTitle(),
                listing.getDescription(),
                listing.getCategory(),
                listing.getPrice(),
                listing.getCondition(),
                listing.getStatus(),
                listing.getImageUrls(),
                listing.getSeller().getId(),
                listing.getSeller().getDisplayName(),
                listing.getCreatedAt());
    }
}
