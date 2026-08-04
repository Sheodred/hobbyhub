package dev.adriankluge.hobbyhub.marketplace.repository;

import dev.adriankluge.hobbyhub.marketplace.entity.Listing;
import dev.adriankluge.hobbyhub.marketplace.entity.ListingCategory;
import dev.adriankluge.hobbyhub.marketplace.entity.ListingStatus;
import java.math.BigDecimal;
import org.springframework.data.jpa.domain.Specification;

public final class ListingSpecifications {

    private ListingSpecifications() {}

    public static Specification<Listing> excludingRemoved() {
        return (root, query, cb) -> cb.notEqual(root.get("status"), ListingStatus.REMOVED);
    }

    public static Specification<Listing> category(ListingCategory category) {
        return (root, query, cb) -> category == null ? null : cb.equal(root.get("category"), category);
    }

    public static Specification<Listing> priceAtLeast(BigDecimal minPrice) {
        return (root, query, cb) -> minPrice == null ? null : cb.greaterThanOrEqualTo(root.get("price"), minPrice);
    }

    public static Specification<Listing> priceAtMost(BigDecimal maxPrice) {
        return (root, query, cb) -> maxPrice == null ? null : cb.lessThanOrEqualTo(root.get("price"), maxPrice);
    }
}
