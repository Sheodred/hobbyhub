package dev.adriankluge.hobbyhub.mtg.meta.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import dev.adriankluge.hobbyhub.mtg.meta.entity.MtgMetaCategory;
import dev.adriankluge.hobbyhub.mtg.meta.entity.MtgMetaEntry;
import dev.adriankluge.hobbyhub.mtg.meta.repository.MtgMetaEntryRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(MtgMetaController.class)
@AutoConfigureMockMvc(addFilters = false)
class MtgMetaControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private MtgMetaEntryRepository repository;

    @Test
    void returnsAllFourCategoriesGrouped() throws Exception {
        when(repository.findByCategoryOrderBySortOrderAsc(MtgMetaCategory.MOST_PLAYED_CARDS))
                .thenReturn(List.of(new MtgMetaEntry(
                        MtgMetaCategory.MOST_PLAYED_CARDS, "Sol Ring", "https://edhrec.com/cards/sol-ring", 200000, 0)));
        when(repository.findByCategoryOrderBySortOrderAsc(MtgMetaCategory.POPULAR_COMMANDER_DECKS)).thenReturn(List.of());
        when(repository.findByCategoryOrderBySortOrderAsc(MtgMetaCategory.STANDARD_DECKS)).thenReturn(List.of());
        when(repository.findByCategoryOrderBySortOrderAsc(MtgMetaCategory.COMMANDER_DECKS)).thenReturn(List.of());

        mockMvc.perform(get("/api/mtg/meta"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mostPlayedCards[0].name").value("Sol Ring"))
                .andExpect(jsonPath("$.popularCommanderDecks").isEmpty())
                .andExpect(jsonPath("$.standardDecks").isEmpty())
                .andExpect(jsonPath("$.commanderDecks").isEmpty());
    }
}
