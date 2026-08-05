package dev.adriankluge.hobbyhub.mtg.meta.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

// Mirrors just the path this app actually reads out of EDHREC's page JSON:
// container.json_dict.cardlists[].cardviews[].{name,url,num_decks} - the
// real response has many more fields (breadcrumbs, related_info, panels,
// ...) that aren't modeled here.
@JsonIgnoreProperties(ignoreUnknown = true)
public record EdhrecPageDto(EdhrecContainerDto container) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record EdhrecContainerDto(@JsonProperty("json_dict") EdhrecJsonDictDto jsonDict) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record EdhrecJsonDictDto(List<EdhrecCardlistDto> cardlists) {}

    public List<EdhrecCardviewDto> firstCardlistViews() {
        if (container == null || container.jsonDict() == null || container.jsonDict().cardlists() == null) {
            return List.of();
        }
        List<EdhrecCardlistDto> cardlists = container.jsonDict().cardlists();
        return cardlists.isEmpty() ? List.of() : cardlists.get(0).cardviews();
    }
}
