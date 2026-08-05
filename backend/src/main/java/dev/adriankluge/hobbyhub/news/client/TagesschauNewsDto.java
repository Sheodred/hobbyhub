package dev.adriankluge.hobbyhub.news.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.Instant;

// The real response has many more fields (teaserImage variants, tags, full
// HTML content, ...) - only what's actually shown in the homepage panel is
// mapped, everything else is ignored rather than modeled.
@JsonIgnoreProperties(ignoreUnknown = true)
public record TagesschauNewsDto(String sophoraId, String title, Instant date, String firstSentence, String shareURL) {}
