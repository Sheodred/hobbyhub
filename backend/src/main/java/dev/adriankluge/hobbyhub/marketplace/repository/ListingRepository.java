package dev.adriankluge.hobbyhub.marketplace.repository;

import dev.adriankluge.hobbyhub.marketplace.entity.Listing;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ListingRepository extends JpaRepository<Listing, UUID>, JpaSpecificationExecutor<Listing> {}
