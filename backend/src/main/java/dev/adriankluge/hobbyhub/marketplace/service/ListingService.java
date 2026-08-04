package dev.adriankluge.hobbyhub.marketplace.service;

import dev.adriankluge.hobbyhub.auth.entity.Role;
import dev.adriankluge.hobbyhub.auth.entity.User;
import dev.adriankluge.hobbyhub.auth.filter.AuthenticatedUser;
import dev.adriankluge.hobbyhub.auth.repository.UserRepository;
import dev.adriankluge.hobbyhub.marketplace.dto.CreateListingRequest;
import dev.adriankluge.hobbyhub.marketplace.dto.ListingResponse;
import dev.adriankluge.hobbyhub.marketplace.dto.UpdateListingRequest;
import dev.adriankluge.hobbyhub.marketplace.entity.Listing;
import dev.adriankluge.hobbyhub.marketplace.entity.ListingCategory;
import dev.adriankluge.hobbyhub.marketplace.entity.ListingStatus;
import dev.adriankluge.hobbyhub.marketplace.repository.ListingRepository;
import dev.adriankluge.hobbyhub.marketplace.repository.ListingSpecifications;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ListingService {

    private final ListingRepository listingRepository;
    private final UserRepository userRepository;

    public ListingService(ListingRepository listingRepository, UserRepository userRepository) {
        this.listingRepository = listingRepository;
        this.userRepository = userRepository;
    }

    public Page<ListingResponse> search(
            ListingCategory category, BigDecimal minPrice, BigDecimal maxPrice, String sort, int page, int size) {
        Specification<Listing> spec = Specification.where(ListingSpecifications.excludingRemoved())
                .and(ListingSpecifications.category(category))
                .and(ListingSpecifications.priceAtLeast(minPrice))
                .and(ListingSpecifications.priceAtMost(maxPrice));

        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size), resolveSort(sort));
        return listingRepository.findAll(spec, pageable).map(ListingResponse::from);
    }

    public ListingResponse get(UUID id) {
        return ListingResponse.from(loadActive(id));
    }

    public ListingResponse create(AuthenticatedUser principal, CreateListingRequest request) {
        User seller = loadUser(principal);
        Listing listing = new Listing(
                seller, request.title(), request.description(), request.category(), request.price(), request.condition());
        if (request.imageUrls() != null) {
            listing.setImageUrls(request.imageUrls());
        }
        return ListingResponse.from(listingRepository.save(listing));
    }

    public ListingResponse update(AuthenticatedUser principal, UUID id, UpdateListingRequest request) {
        Listing listing = loadForEdit(principal, id);
        listing.update(
                request.title(),
                request.description(),
                request.category(),
                request.price(),
                request.condition(),
                request.status(),
                request.imageUrls() != null ? request.imageUrls() : List.of());
        // findById returns a detached entity outside a transaction (open-in-view
        // is disabled) - mutating it in memory doesn't persist anything without
        // an explicit save, unlike an entity mutated inside a @Transactional
        // method where Hibernate's dirty checking would pick it up.
        return ListingResponse.from(listingRepository.save(listing));
    }

    public void delete(AuthenticatedUser principal, UUID id) {
        Listing listing = loadForEdit(principal, id);
        listing.remove();
        listingRepository.save(listing);
    }

    private Listing loadForEdit(AuthenticatedUser principal, UUID id) {
        Listing listing = listingRepository
                .findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));
        boolean isOwner = listing.isOwnedBy(principal.id());
        boolean isAdmin = principal.role() == Role.ADMIN;
        if (!isOwner && !isAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your listing");
        }
        return listing;
    }

    private Listing loadActive(UUID id) {
        return listingRepository
                .findById(id)
                .filter(listing -> listing.getStatus() != ListingStatus.REMOVED)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));
    }

    private User loadUser(AuthenticatedUser principal) {
        return userRepository
                .findById(principal.id())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private static int clampSize(int size) {
        if (size <= 0) return 20;
        return Math.min(size, 50);
    }

    private static Sort resolveSort(String sort) {
        return switch (sort) {
            case "price_asc" -> Sort.by(Sort.Direction.ASC, "price");
            case "price_desc" -> Sort.by(Sort.Direction.DESC, "price");
            default -> Sort.by(Sort.Direction.DESC, "createdAt");
        };
    }
}
