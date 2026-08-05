package dev.adriankluge.hobbyhub.mtg.meta.dto;

import dev.adriankluge.hobbyhub.mtg.meta.entity.MtgMetaEntry;

public record MetaEntryResponse(String name, String url, Integer numDecks) {

    public static MetaEntryResponse from(MtgMetaEntry entry) {
        return new MetaEntryResponse(entry.getName(), entry.getUrl(), entry.getNumDecks());
    }
}
