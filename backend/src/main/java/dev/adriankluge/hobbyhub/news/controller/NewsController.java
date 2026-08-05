package dev.adriankluge.hobbyhub.news.controller;

import dev.adriankluge.hobbyhub.news.dto.NewsItemResponse;
import dev.adriankluge.hobbyhub.news.entity.NewsSource;
import dev.adriankluge.hobbyhub.news.repository.NewsItemRepository;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Serves whatever NewsRefreshService last cached - never calls an external
// news source directly from a request (section 4.1 of the brief).
@RestController
@RequestMapping("/api/news")
public class NewsController {

    private final NewsItemRepository newsItemRepository;

    public NewsController(NewsItemRepository newsItemRepository) {
        this.newsItemRepository = newsItemRepository;
    }

    @GetMapping("/tagesschau")
    public List<NewsItemResponse> tagesschau() {
        return newsItemRepository.findBySourceOrderBySortOrderAsc(NewsSource.TAGESSCHAU).stream()
                .map(NewsItemResponse::from)
                .toList();
    }
}
