package dev.adriankluge.hobbyhub.mtg.meta.service;

import dev.adriankluge.hobbyhub.mtg.meta.client.EdhrecClient;
import dev.adriankluge.hobbyhub.mtg.meta.client.MetaEntry;
import dev.adriankluge.hobbyhub.mtg.meta.client.MtgGoldfishClient;
import dev.adriankluge.hobbyhub.mtg.meta.entity.MtgMetaCategory;
import dev.adriankluge.hobbyhub.mtg.meta.entity.MtgMetaEntry;
import dev.adriankluge.hobbyhub.mtg.meta.repository.MtgMetaEntryRepository;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Refreshes all four "Meta & Stats" widgets (section 4.5) every 4 hours and
// caches them in Postgres - the page only ever reads from here, never calls
// EDHREC/MTGGoldfish live per page view. Same replace-on-success,
// keep-existing-cache-on-failure shape as news.service.NewsRefreshService,
// and disableable the same way (app.mtg.meta-scheduling-enabled) for tests.
@Service
@ConditionalOnProperty(name = "app.mtg.meta-scheduling-enabled", havingValue = "true", matchIfMissing = true)
public class MtgMetaRefreshService {

    private static final Logger log = LoggerFactory.getLogger(MtgMetaRefreshService.class);

    private final EdhrecClient edhrecClient;
    private final MtgGoldfishClient mtgGoldfishClient;
    private final MtgMetaEntryRepository repository;

    public MtgMetaRefreshService(
            EdhrecClient edhrecClient, MtgGoldfishClient mtgGoldfishClient, MtgMetaEntryRepository repository) {
        this.edhrecClient = edhrecClient;
        this.mtgGoldfishClient = mtgGoldfishClient;
        this.repository = repository;
    }

    @Scheduled(initialDelay = 0, fixedRate = 4, timeUnit = TimeUnit.HOURS)
    public void refreshMostPlayedCards() {
        refresh(MtgMetaCategory.MOST_PLAYED_CARDS, edhrecClient::mostPlayedCards);
    }

    @Scheduled(initialDelay = 0, fixedRate = 4, timeUnit = TimeUnit.HOURS)
    public void refreshPopularCommanderDecks() {
        refresh(MtgMetaCategory.POPULAR_COMMANDER_DECKS, edhrecClient::popularCommanderDecks);
    }

    @Scheduled(initialDelay = 0, fixedRate = 4, timeUnit = TimeUnit.HOURS)
    public void refreshStandardDecks() {
        refresh(MtgMetaCategory.STANDARD_DECKS, mtgGoldfishClient::standardDecks);
    }

    @Scheduled(initialDelay = 0, fixedRate = 4, timeUnit = TimeUnit.HOURS)
    public void refreshCommanderDecks() {
        refresh(MtgMetaCategory.COMMANDER_DECKS, mtgGoldfishClient::commanderDecks);
    }

    private void refresh(MtgMetaCategory category, Supplier<List<MetaEntry>> fetcher) {
        try {
            List<MetaEntry> items = fetcher.get();
            replaceCache(category, items);
        } catch (Exception e) {
            log.warn("Failed to refresh MTG meta category {} - keeping the existing cache", category, e);
        }
    }

    @Transactional
    protected void replaceCache(MtgMetaCategory category, List<MetaEntry> items) {
        repository.deleteByCategory(category);
        int order = 0;
        for (MetaEntry item : items) {
            repository.save(new MtgMetaEntry(category, item.name(), item.url(), item.numDecks(), order++));
        }
    }
}
