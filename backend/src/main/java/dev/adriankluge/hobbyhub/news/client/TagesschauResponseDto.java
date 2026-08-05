package dev.adriankluge.hobbyhub.news.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TagesschauResponseDto(List<TagesschauNewsDto> news) {}
