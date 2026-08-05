package dev.adriankluge.hobbyhub.mtg.combo.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record VariantsResponseDto(List<VariantDto> results) {}
