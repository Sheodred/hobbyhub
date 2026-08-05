package dev.adriankluge.hobbyhub.mtg.meta.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record EdhrecCardlistDto(String header, String tag, List<EdhrecCardviewDto> cardviews) {}
