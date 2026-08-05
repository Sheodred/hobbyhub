package dev.adriankluge.hobbyhub.mtg.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import dev.adriankluge.hobbyhub.mtg.client.ScryfallClient;
import dev.adriankluge.hobbyhub.mtg.combo.client.CommanderSpellbookClient;
import dev.adriankluge.hobbyhub.mtg.combo.dto.ComboResponse;
import dev.adriankluge.hobbyhub.mtg.dto.Card;
import dev.adriankluge.hobbyhub.mtg.dto.CardSearchResponse;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(MtgController.class)
@AutoConfigureMockMvc(addFilters = false)
class MtgControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ScryfallClient scryfallClient;

    @MockBean
    private CommanderSpellbookClient commanderSpellbookClient;

    @Test
    void rejectsBlankQuery() throws Exception {
        mockMvc.perform(get("/api/mtg/search").param("q", "")).andExpect(status().isBadRequest());
    }

    @Test
    void returnsSearchResults() throws Exception {
        Card card = new Card(
                "id-1", "Lightning Bolt", "{R}", "Instant", "3 damage.", List.of("R"), "Alpha", "common",
                "https://img/normal.jpg", "https://img/art.jpg");
        when(scryfallClient.search(eq("bolt"), eq(1))).thenReturn(new CardSearchResponse(List.of(card), false, 1));

        mockMvc.perform(get("/api/mtg/search").param("q", "bolt"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cards[0].name").value("Lightning Bolt"))
                .andExpect(jsonPath("$.totalCards").value(1));
    }

    @Test
    void returns404WhenCardNotFound() throws Exception {
        when(scryfallClient.getCard(any())).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/mtg/cards/missing")).andExpect(status().isNotFound());
    }

    @Test
    void returnsAllPrintingsForAName() throws Exception {
        Card alpha = new Card(
                "id-alpha", "Lightning Bolt", "{R}", "Instant", "3 damage.", List.of("R"), "Alpha", "common",
                "https://img/alpha.jpg", "https://img/alpha-art.jpg");
        when(scryfallClient.getPrintings("Lightning Bolt")).thenReturn(List.of(alpha));

        mockMvc.perform(get("/api/mtg/printings").param("name", "Lightning Bolt"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].setName").value("Alpha"));
    }

    @Test
    void returnsACardByExactName() throws Exception {
        Card card = new Card(
                "id-1", "Sol Ring", "{1}", "Artifact", "Tap: add 2 colorless.", List.of(), "Alpha", "uncommon",
                "https://img/sol-ring.jpg", "https://img/sol-ring-art.jpg");
        when(scryfallClient.getCardByName("Sol Ring")).thenReturn(Optional.of(card));

        mockMvc.perform(get("/api/mtg/cards/by-name").param("name", "Sol Ring"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imageUrl").value("https://img/sol-ring.jpg"));
    }

    @Test
    void returns404WhenNoExactNameMatch() throws Exception {
        when(scryfallClient.getCardByName("Not A Real Card")).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/mtg/cards/by-name").param("name", "Not A Real Card")).andExpect(status().isNotFound());
    }

    @Test
    void returnsCombosForACard() throws Exception {
        ComboResponse combo = new ComboResponse(
                List.of("Firemind's Foresight"), 2, 206, List.of("Infinite damage"),
                "https://commanderspellbook.com/combo/x/");
        when(commanderSpellbookClient.findCombos("Lightning Bolt")).thenReturn(List.of(combo));

        mockMvc.perform(get("/api/mtg/combos").param("cardName", "Lightning Bolt"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].otherCards[0]").value("Firemind's Foresight"))
                .andExpect(jsonPath("$[0].cardCount").value(2))
                .andExpect(jsonPath("$[0].numDecks").value(206));
    }
}
