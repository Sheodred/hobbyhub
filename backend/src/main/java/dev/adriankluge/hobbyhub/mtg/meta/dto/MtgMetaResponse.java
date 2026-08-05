package dev.adriankluge.hobbyhub.mtg.meta.dto;

import java.util.List;

public record MtgMetaResponse(
        List<MetaEntryResponse> mostPlayedCards,
        List<MetaEntryResponse> popularCommanderDecks,
        List<MetaEntryResponse> standardDecks,
        List<MetaEntryResponse> commanderDecks) {}
