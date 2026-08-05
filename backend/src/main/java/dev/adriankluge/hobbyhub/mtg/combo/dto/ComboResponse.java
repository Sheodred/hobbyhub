package dev.adriankluge.hobbyhub.mtg.combo.dto;

import java.util.List;

public record ComboResponse(List<String> otherCards, int cardCount, Integer numDecks, List<String> produces, String url) {}
