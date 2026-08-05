package dev.adriankluge.hobbyhub.mtg.combo.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CardRefDto(String name) {}
