package dev.adriankluge.hobbyhub.mtg.controller;

import dev.adriankluge.hobbyhub.mtg.client.ScryfallClient;
import dev.adriankluge.hobbyhub.mtg.dto.Card;
import dev.adriankluge.hobbyhub.mtg.dto.CardSearchResponse;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

// Public, unauthenticated (see docs/adr/0003) - Scryfall's terms forbid
// paywalling card data, and proxying is orthogonal to that rule either way.
@RestController
@RequestMapping("/api/mtg")
@Validated
public class MtgController {

    private final ScryfallClient scryfallClient;

    public MtgController(ScryfallClient scryfallClient) {
        this.scryfallClient = scryfallClient;
    }

    @GetMapping("/search")
    public CardSearchResponse search(
            @RequestParam @NotBlank String q, @RequestParam(name = "page", defaultValue = "1") int page) {
        return scryfallClient.search(q, page);
    }

    @GetMapping("/cards/{id}")
    public Card getCard(@PathVariable String id) {
        return scryfallClient
                .getCard(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Card not found"));
    }
}
