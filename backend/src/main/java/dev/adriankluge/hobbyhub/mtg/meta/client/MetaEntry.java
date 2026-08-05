package dev.adriankluge.hobbyhub.mtg.meta.client;

/** Source-agnostic shape both meta-data clients (EDHREC, MTGGoldfish) map their responses into. */
public record MetaEntry(String name, String url, Integer numDecks) {}
