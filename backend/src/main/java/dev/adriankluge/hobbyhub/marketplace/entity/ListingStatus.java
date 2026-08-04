package dev.adriankluge.hobbyhub.marketplace.entity;

public enum ListingStatus {
    ACTIVE,
    RESERVED,
    SOLD,
    // Soft delete - DELETE /api/listings/{id} sets this rather than removing
    // the row, so a listing a buyer already inquired about doesn't 404.
    REMOVED,
}
