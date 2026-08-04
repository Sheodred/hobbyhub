package dev.adriankluge.hobbyhub.mtg.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ScryfallSearchResponseDto(
        List<ScryfallCardDto> data, @JsonProperty("has_more") boolean hasMore, @JsonProperty("total_cards") int totalCards) {}
