package dev.adriankluge.hobbyhub.marketplace.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import dev.adriankluge.hobbyhub.auth.entity.Role;
import dev.adriankluge.hobbyhub.auth.entity.User;
import dev.adriankluge.hobbyhub.auth.filter.AuthenticatedUser;
import dev.adriankluge.hobbyhub.auth.repository.UserRepository;
import dev.adriankluge.hobbyhub.marketplace.dto.UpdateListingRequest;
import dev.adriankluge.hobbyhub.marketplace.entity.Listing;
import dev.adriankluge.hobbyhub.marketplace.entity.ListingCategory;
import dev.adriankluge.hobbyhub.marketplace.entity.ListingStatus;
import dev.adriankluge.hobbyhub.marketplace.repository.ListingRepository;
import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class ListingServiceTest {

    private final ListingRepository listingRepository = mock(ListingRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final ListingService service = new ListingService(listingRepository, userRepository);

    private final User owner = new User("owner@example.com", "hashed", "Owner");
    private final User stranger = new User("stranger@example.com", "hashed", "Stranger");
    private final Listing listing =
            new Listing(owner, "Lightning Bolt", "MTG card", ListingCategory.MTG_SINGLE, new BigDecimal("1.50"), "NM");

    private static final UpdateListingRequest UPDATE = new UpdateListingRequest(
            "Hijacked", "desc", ListingCategory.OTHER, new BigDecimal("0.01"), "Good", ListingStatus.ACTIVE, null);

    @Test
    void ownerCanUpdateTheirOwnListing() {
        when(listingRepository.findById(listing.getId())).thenReturn(Optional.of(listing));
        when(listingRepository.save(listing)).thenReturn(listing);
        AuthenticatedUser principal = new AuthenticatedUser(owner.getId(), owner.getEmail(), Role.USER);

        service.update(principal, listing.getId(), UPDATE);

        assertThat(listing.getTitle()).isEqualTo("Hijacked");
        // The entity returned by findById is detached (open-in-view is off) -
        // mutating it without an explicit save() silently doesn't persist
        // anything, a real bug this project already shipped once and only
        // caught via live verification. Locking it in here so it can't recur.
        verify(listingRepository).save(listing);
    }

    @Test
    void anotherUserCannotUpdateSomeoneElsesListing() {
        when(listingRepository.findById(listing.getId())).thenReturn(Optional.of(listing));
        AuthenticatedUser principal = new AuthenticatedUser(stranger.getId(), stranger.getEmail(), Role.USER);

        assertThatThrownBy(() -> service.update(principal, listing.getId(), UPDATE))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode().value()).isEqualTo(403));
        assertThat(listing.getTitle()).isEqualTo("Lightning Bolt");
        verify(listingRepository, never()).save(any());
    }

    @Test
    void anAdminCanUpdateAnyonesListing() {
        when(listingRepository.findById(listing.getId())).thenReturn(Optional.of(listing));
        when(listingRepository.save(listing)).thenReturn(listing);
        AuthenticatedUser principal = new AuthenticatedUser(UUID.randomUUID(), "admin@example.com", Role.ADMIN);

        service.update(principal, listing.getId(), UPDATE);

        assertThat(listing.getTitle()).isEqualTo("Hijacked");
    }

    @Test
    void anotherUserCannotDeleteSomeoneElsesListing() {
        when(listingRepository.findById(listing.getId())).thenReturn(Optional.of(listing));
        AuthenticatedUser principal = new AuthenticatedUser(stranger.getId(), stranger.getEmail(), Role.USER);

        assertThatThrownBy(() -> service.delete(principal, listing.getId()))
                .isInstanceOf(ResponseStatusException.class);
        assertThat(listing.getStatus()).isEqualTo(ListingStatus.ACTIVE);
        verify(listingRepository, never()).save(any());
    }

    @Test
    void deleteSoftRemovesRatherThanDeletingTheRow() {
        when(listingRepository.findById(listing.getId())).thenReturn(Optional.of(listing));
        AuthenticatedUser principal = new AuthenticatedUser(owner.getId(), owner.getEmail(), Role.USER);

        service.delete(principal, listing.getId());

        assertThat(listing.getStatus()).isEqualTo(ListingStatus.REMOVED);
        verify(listingRepository).save(listing);
    }

    @Test
    void getThrowsNotFoundForARemovedListing() {
        listing.remove();
        when(listingRepository.findById(listing.getId())).thenReturn(Optional.of(listing));

        assertThatThrownBy(() -> service.get(listing.getId()))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode().value()).isEqualTo(404));
    }

    @Test
    void updateThrowsNotFoundForAnUnknownId() {
        UUID missingId = UUID.randomUUID();
        when(listingRepository.findById(missingId)).thenReturn(Optional.empty());
        AuthenticatedUser principal = new AuthenticatedUser(owner.getId(), owner.getEmail(), Role.USER);

        assertThatThrownBy(() -> service.update(principal, missingId, UPDATE))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode().value()).isEqualTo(404));
    }
}
