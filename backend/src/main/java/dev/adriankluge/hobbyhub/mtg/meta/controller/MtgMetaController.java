package dev.adriankluge.hobbyhub.mtg.meta.controller;

import dev.adriankluge.hobbyhub.mtg.meta.dto.MetaEntryResponse;
import dev.adriankluge.hobbyhub.mtg.meta.dto.MtgMetaResponse;
import dev.adriankluge.hobbyhub.mtg.meta.entity.MtgMetaCategory;
import dev.adriankluge.hobbyhub.mtg.meta.repository.MtgMetaEntryRepository;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Serves whatever MtgMetaRefreshService last cached - never calls
// EDHREC/MTGGoldfish directly from a request (section 4.5 of the brief).
@RestController
@RequestMapping("/api/mtg/meta")
public class MtgMetaController {

    private final MtgMetaEntryRepository repository;

    public MtgMetaController(MtgMetaEntryRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public MtgMetaResponse meta() {
        return new MtgMetaResponse(
                entries(MtgMetaCategory.MOST_PLAYED_CARDS),
                entries(MtgMetaCategory.POPULAR_COMMANDER_DECKS),
                entries(MtgMetaCategory.STANDARD_DECKS),
                entries(MtgMetaCategory.COMMANDER_DECKS));
    }

    private List<MetaEntryResponse> entries(MtgMetaCategory category) {
        return repository.findByCategoryOrderBySortOrderAsc(category).stream().map(MetaEntryResponse::from).toList();
    }
}
