package dev.adriankluge.hobbyhub.news.service;

import dev.adriankluge.hobbyhub.news.client.FetchedNewsItem;
import dev.adriankluge.hobbyhub.news.client.TagesschauClient;
import dev.adriankluge.hobbyhub.news.client.WotcNewsClient;
import dev.adriankluge.hobbyhub.news.entity.NewsItem;
import dev.adriankluge.hobbyhub.news.entity.NewsSource;
import dev.adriankluge.hobbyhub.news.repository.NewsItemRepository;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Fetches each news source on a schedule and caches the result in Postgres -
// the homepage panels (see the frontend NewsController) only ever read from
// here, never call Tagesschau/WotC live per page view (section 4.1 of the
// brief). A failed fetch leaves the previous cache in place rather than
// wiping the panel; only a successful fetch replaces the cached rows for
// that source.
//
// Disableable via app.news.scheduling-enabled (defaults to on) so
// @SpringBootTest-based tests don't fire real outbound HTTP calls against a
// database that hasn't necessarily even got the news_items table yet - see
// the @TestPropertySource overrides on those test classes.
@Service
@ConditionalOnProperty(name = "app.news.scheduling-enabled", havingValue = "true", matchIfMissing = true)
public class NewsRefreshService {

    private static final Logger log = LoggerFactory.getLogger(NewsRefreshService.class);

    private final TagesschauClient tagesschauClient;
    private final WotcNewsClient wotcNewsClient;
    private final NewsItemRepository newsItemRepository;

    public NewsRefreshService(
            TagesschauClient tagesschauClient, WotcNewsClient wotcNewsClient, NewsItemRepository newsItemRepository) {
        this.tagesschauClient = tagesschauClient;
        this.wotcNewsClient = wotcNewsClient;
        this.newsItemRepository = newsItemRepository;
    }

    // initialDelay = 0 so the cache isn't empty until the first scheduled tick;
    // every 20 minutes after that is 3 requests/hour, well within Tagesschau's
    // documented 60/hour cap.
    @Scheduled(initialDelay = 0, fixedRate = 20, timeUnit = TimeUnit.MINUTES)
    public void refreshTagesschau() {
        try {
            List<FetchedNewsItem> items = tagesschauClient.fetchLatest();
            replaceCache(NewsSource.TAGESSCHAU, items);
        } catch (Exception e) {
            log.warn("Failed to refresh Tagesschau news - keeping the existing cache", e);
        }
    }

    // WotcNewsClient itself already falls back to a manual list on scrape
    // failure rather than throwing, but this is still wrapped the same way
    // as Tagesschau in case the DB write itself fails.
    @Scheduled(initialDelay = 0, fixedRate = 20, timeUnit = TimeUnit.MINUTES)
    public void refreshWotc() {
        try {
            List<FetchedNewsItem> items = wotcNewsClient.fetchLatest();
            replaceCache(NewsSource.WOTC, items);
        } catch (Exception e) {
            log.warn("Failed to refresh WotC news - keeping the existing cache", e);
        }
    }

    @Transactional
    protected void replaceCache(NewsSource source, List<FetchedNewsItem> items) {
        newsItemRepository.deleteBySource(source);
        int order = 0;
        for (FetchedNewsItem item : items) {
            newsItemRepository.save(
                    new NewsItem(source, item.headline(), item.teaser(), item.url(), item.publishedAt(), order++));
        }
    }
}
