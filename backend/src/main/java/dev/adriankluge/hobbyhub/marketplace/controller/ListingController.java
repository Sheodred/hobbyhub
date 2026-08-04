package dev.adriankluge.hobbyhub.marketplace.controller;

import dev.adriankluge.hobbyhub.auth.filter.AuthenticatedUser;
import dev.adriankluge.hobbyhub.marketplace.dto.CreateListingRequest;
import dev.adriankluge.hobbyhub.marketplace.dto.ListingResponse;
import dev.adriankluge.hobbyhub.marketplace.dto.UpdateListingRequest;
import dev.adriankluge.hobbyhub.marketplace.entity.ListingCategory;
import dev.adriankluge.hobbyhub.marketplace.service.ListingService;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/listings")
public class ListingController {

    private final ListingService listingService;

    public ListingController(ListingService listingService) {
        this.listingService = listingService;
    }

    // Public - see SecurityConfig for the GET-only permitAll rule on this path.
    @GetMapping
    public Page<ListingResponse> list(
            @RequestParam(required = false) ListingCategory category,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(defaultValue = "newest") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return listingService.search(category, minPrice, maxPrice, sort, page, size);
    }

    @GetMapping("/{id}")
    public ListingResponse get(@PathVariable UUID id) {
        return listingService.get(id);
    }

    @PostMapping
    public ResponseEntity<ListingResponse> create(
            @AuthenticationPrincipal AuthenticatedUser principal, @Valid @RequestBody CreateListingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(listingService.create(principal, request));
    }

    @PatchMapping("/{id}")
    public ListingResponse update(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateListingRequest request) {
        return listingService.update(principal, id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable UUID id) {
        listingService.delete(principal, id);
        return ResponseEntity.noContent().build();
    }
}
