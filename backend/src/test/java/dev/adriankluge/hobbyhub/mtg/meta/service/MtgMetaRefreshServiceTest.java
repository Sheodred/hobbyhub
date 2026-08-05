package dev.adriankluge.hobbyhub.mtg.meta.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import dev.adriankluge.hobbyhub.mtg.meta.client.EdhrecClient;
import dev.adriankluge.hobbyhub.mtg.meta.client.MetaEntry;
import dev.adriankluge.hobbyhub.mtg.meta.client.MtgGoldfishClient;
import dev.adriankluge.hobbyhub.mtg.meta.entity.MtgMetaCategory;
import dev.adriankluge.hobbyhub.mtg.meta.entity.MtgMetaEntry;
import dev.adriankluge.hobbyhub.mtg.meta.repository.MtgMetaEntryRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MtgMetaRefreshServiceTest {

    @Mock
    private EdhrecClient edhrecClient;

    @Mock
    private MtgGoldfishClient mtgGoldfishClient;

    @Mock
    private MtgMetaEntryRepository repository;

    @InjectMocks
    private MtgMetaRefreshService service;

    @Test
    void aSuccessfulRefreshReplacesOnlyThatCategorysCachedRows() {
        when(edhrecClient.mostPlayedCards()).thenReturn(List.of(new MetaEntry("Sol Ring", "https://edhrec.com/cards/sol-ring", 200000)));

        service.refreshMostPlayedCards();

        verify(repository, times(1)).deleteByCategory(MtgMetaCategory.MOST_PLAYED_CARDS);
        verify(repository, times(1)).save(any(MtgMetaEntry.class));
        verify(repository, never()).deleteByCategory(MtgMetaCategory.STANDARD_DECKS);
    }

    @Test
    void aFailedFetchLeavesTheExistingCacheUntouched() {
        when(mtgGoldfishClient.standardDecks()).thenThrow(new RuntimeException("MTGGoldfish is down"));

        service.refreshStandardDecks();

        verify(repository, never()).deleteByCategory(any());
        verify(repository, never()).save(any());
    }
}
