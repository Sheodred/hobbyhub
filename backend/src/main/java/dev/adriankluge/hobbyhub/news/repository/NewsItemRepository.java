package dev.adriankluge.hobbyhub.news.repository;

import dev.adriankluge.hobbyhub.news.entity.NewsItem;
import dev.adriankluge.hobbyhub.news.entity.NewsSource;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NewsItemRepository extends JpaRepository<NewsItem, java.util.UUID> {

    List<NewsItem> findBySourceOrderBySortOrderAsc(NewsSource source);

    void deleteBySource(NewsSource source);
}
