package dev.adriankluge.hobbyhub.mtg.dto;

import java.util.List;

public record CardSearchResponse(List<Card> cards, boolean hasMore, int totalCards) {

    public static CardSearchResponse empty() {
        return new CardSearchResponse(List.of(), false, 0);
    }
}
