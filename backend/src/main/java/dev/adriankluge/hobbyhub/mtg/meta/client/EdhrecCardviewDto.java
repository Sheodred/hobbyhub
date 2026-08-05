package dev.adriankluge.hobbyhub.mtg.meta.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record EdhrecCardviewDto(String name, String url, @JsonProperty("num_decks") Integer numDecks) {}
