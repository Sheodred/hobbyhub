package dev.adriankluge.hobbyhub.marketplace;

import dev.adriankluge.hobbyhub.auth.entity.User;
import dev.adriankluge.hobbyhub.auth.repository.UserRepository;
import dev.adriankluge.hobbyhub.marketplace.entity.Listing;
import dev.adriankluge.hobbyhub.marketplace.entity.ListingCategory;
import dev.adriankluge.hobbyhub.marketplace.repository.ListingRepository;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Dev-only demo data so the marketplace isn't empty on a fresh local
 * checkout. The MTG_SINGLE entries mirror real listings (card name,
 * condition, price) from the site owner's own Cardmarket seller page -
 * board-game entries are illustrative, not real inventory.
 */
@Component
@Profile("dev")
public class MarketplaceDevSeeder implements ApplicationRunner {

    private static final String SELLER_EMAIL = "demo-seller@hobbyhub.local";

    private final UserRepository userRepository;
    private final ListingRepository listingRepository;
    private final PasswordEncoder passwordEncoder;

    public MarketplaceDevSeeder(
            UserRepository userRepository, ListingRepository listingRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.listingRepository = listingRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (listingRepository.count() > 0) {
            return;
        }

        User seller = userRepository.findByEmail(SELLER_EMAIL).orElseGet(() -> userRepository.save(new User(
                SELLER_EMAIL, passwordEncoder.encode("dev-only-demo-password"), "Adrian")));

        List<Listing> cardListings = List.of(
                        mtgSingle(seller, "Art Series: Renowned Weaponsmith (V.2)", "0.51"),
                        mtgSingle(seller, "Art Series: Ezuri's Predation (V.2)", "0.50"),
                        mtgSingle(seller, "Art Series: Maelstrom Wanderer (V.2)", "0.43"),
                        mtgSingle(seller, "Art Series: Teysa Karlov (V.2)", "0.48"),
                        mtgSingle(seller, "Art Series: Yuriko, the Tiger's Shadow (V.2)", "0.38"),
                        mtgSingle(seller, "The Animus", "0.25"),
                        mtgSingle(seller, "Ulalek, Fused Atrocity", "0.50"),
                        mtgSingle(seller, "Desmond Miles (V.2)", "0.68"),
                        mtgSingle(seller, "Glasswing Grace // Age-Graced Chapel", "0.20"),
                        mtgSingle(seller, "Duelist of the Mind", "0.76"),
                        mtgSingle(seller, "Season of the Burrow", "2.97"),
                        mtgSingle(seller, "The Ancient One", "0.98"))
                .stream()
                .toList();

        Listing wingspan = new Listing(
                seller,
                "Wingspan (base game)",
                "Complete, all components present. A few light shelf-wear marks on the box.",
                ListingCategory.BOARD_GAME,
                new BigDecimal("28.00"),
                "Good");
        wingspan.setImageUrls(List.of("https://commons.wikimedia.org/wiki/Special:FilePath/Cards_in_Wingspan_board_game.jpg"));

        Listing catan = new Listing(
                seller,
                "Catan (5th edition)",
                "Played a handful of times, kept in original box with insert.",
                ListingCategory.BOARD_GAME,
                new BigDecimal("22.00"),
                "Excellent");
        catan.setImageUrls(List.of("https://commons.wikimedia.org/wiki/Special:FilePath/A_game_of_Settlers_of_Catan.jpg"));

        List<Listing> boardGameListings = List.of(wingspan, catan);

        listingRepository.saveAll(cardListings);
        listingRepository.saveAll(boardGameListings);
    }

    private static Listing mtgSingle(User seller, String cardName, String priceEur) {
        return new Listing(
                seller,
                cardName,
                "Unplayed, kept sleeved.",
                ListingCategory.MTG_SINGLE,
                new BigDecimal(priceEur),
                "Near Mint");
    }
}
