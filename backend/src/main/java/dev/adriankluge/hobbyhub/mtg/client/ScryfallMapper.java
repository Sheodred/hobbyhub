package dev.adriankluge.hobbyhub.mtg.client;

import dev.adriankluge.hobbyhub.mtg.dto.Card;

final class ScryfallMapper {

    private ScryfallMapper() {}

    static Card toCard(ScryfallCardDto dto) {
        ScryfallCardDto.ImageUris images = dto.resolvedImageUris();
        return new Card(
                dto.id(),
                dto.name(),
                dto.manaCost(),
                dto.typeLine(),
                dto.oracleText(),
                dto.colors(),
                dto.setName(),
                dto.rarity(),
                images != null ? images.normal() : null,
                images != null ? images.artCrop() : null);
    }
}
