package dev.adriankluge.hobbyhub.mtg.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

// Mirrors the subset of Scryfall's card object we actually use - not the
// full schema. Internal to the client; never returned directly from our API
// (see MtgMapper for the public shape).
@JsonIgnoreProperties(ignoreUnknown = true)
public record ScryfallCardDto(
        String id,
        String name,
        @JsonProperty("mana_cost") String manaCost,
        @JsonProperty("type_line") String typeLine,
        @JsonProperty("oracle_text") String oracleText,
        List<String> colors,
        @JsonProperty("set_name") String setName,
        String rarity,
        @JsonProperty("image_uris") ImageUris imageUris,
        @JsonProperty("card_faces") List<CardFace> cardFaces) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ImageUris(String normal, @JsonProperty("art_crop") String artCrop) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CardFace(@JsonProperty("image_uris") ImageUris imageUris) {}

    // Double-faced cards carry images per-face instead of top-level.
    public ImageUris resolvedImageUris() {
        if (imageUris != null) {
            return imageUris;
        }
        if (cardFaces != null && !cardFaces.isEmpty()) {
            return cardFaces.get(0).imageUris();
        }
        return null;
    }
}
