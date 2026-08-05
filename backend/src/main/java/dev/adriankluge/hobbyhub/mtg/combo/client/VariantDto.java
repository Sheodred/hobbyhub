package dev.adriankluge.hobbyhub.mtg.combo.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record VariantDto(String id, List<UsesDto> uses, List<ProducesDto> produces, Integer popularity) {}
