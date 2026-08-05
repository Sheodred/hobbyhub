package dev.adriankluge.hobbyhub.news.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import dev.adriankluge.hobbyhub.news.entity.NewsItem;
import dev.adriankluge.hobbyhub.news.entity.NewsSource;
import dev.adriankluge.hobbyhub.news.repository.NewsItemRepository;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(NewsController.class)
@AutoConfigureMockMvc(addFilters = false)
class NewsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private NewsItemRepository newsItemRepository;

    @Test
    void returnsTheCachedTagesschauItemsInOrder() throws Exception {
        NewsItem item = new NewsItem(
                NewsSource.TAGESSCHAU, "Headline", "Teaser", "https://example.com/1", Instant.parse("2026-08-05T08:00:00Z"), 0);
        when(newsItemRepository.findBySourceOrderBySortOrderAsc(NewsSource.TAGESSCHAU)).thenReturn(List.of(item));

        mockMvc.perform(get("/api/news/tagesschau"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].headline").value("Headline"))
                .andExpect(jsonPath("$[0].teaser").value("Teaser"))
                .andExpect(jsonPath("$[0].url").value("https://example.com/1"));
    }
}
