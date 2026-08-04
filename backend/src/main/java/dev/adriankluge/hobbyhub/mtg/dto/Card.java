package dev.adriankluge.hobbyhub.mtg.dto;

import java.util.List;

public record Card(
        String id,
        String name,
        String manaCost,
        String typeLine,
        String oracleText,
        List<String> colors,
        String setName,
        String rarity,
        String imageUrl,
        String artCropUrl) {}
