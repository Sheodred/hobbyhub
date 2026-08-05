package dev.adriankluge.hobbyhub.news.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import dev.adriankluge.hobbyhub.news.client.FetchedNewsItem;
import dev.adriankluge.hobbyhub.news.client.TagesschauClient;
import dev.adriankluge.hobbyhub.news.entity.NewsItem;
import dev.adriankluge.hobbyhub.news.entity.NewsSource;
import dev.adriankluge.hobbyhub.news.repository.NewsItemRepository;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NewsRefreshServiceTest {

    @Mock
    private TagesschauClient tagesschauClient;

    @Mock
    private NewsItemRepository newsItemRepository;

    @InjectMocks
    private NewsRefreshService service;

    @Test
    void aSuccessfulFetchReplacesTheCachedRowsForThatSource() {
        when(tagesschauClient.fetchLatest())
                .thenReturn(List.of(
                        new FetchedNewsItem("Headline", "Teaser", "https://example.com/1", Instant.now())));

        service.refreshTagesschau();

        verify(newsItemRepository, times(1)).deleteBySource(NewsSource.TAGESSCHAU);
        verify(newsItemRepository, times(1)).save(any(NewsItem.class));
    }

    @Test
    void aFailedFetchLeavesTheExistingCacheUntouched() {
        when(tagesschauClient.fetchLatest()).thenThrow(new RuntimeException("Tagesschau is down"));

        service.refreshTagesschau();

        verify(newsItemRepository, never()).deleteBySource(any());
        verify(newsItemRepository, never()).save(any());
    }
}
