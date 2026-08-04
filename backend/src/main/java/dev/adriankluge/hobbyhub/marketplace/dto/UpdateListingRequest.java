package dev.adriankluge.hobbyhub.marketplace.dto;

import dev.adriankluge.hobbyhub.marketplace.entity.ListingCategory;
import dev.adriankluge.hobbyhub.marketplace.entity.ListingStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
import org.hibernate.validator.constraints.URL;

public record UpdateListingRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 4000) String description,
        @NotNull ListingCategory category,
        @NotNull @DecimalMin(value = "0.0", inclusive = true) BigDecimal price,
        @NotBlank @Size(max = 50) String condition,
        @NotNull ListingStatus status,
        List<@URL String> imageUrls) {}
