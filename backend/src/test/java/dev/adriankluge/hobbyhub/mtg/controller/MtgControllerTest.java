package dev.adriankluge.hobbyhub.mtg.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import dev.adriankluge.hobbyhub.mtg.client.ScryfallClient;
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
}
