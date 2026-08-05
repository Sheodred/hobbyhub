package dev.adriankluge.hobbyhub.mtg.meta.repository;

import dev.adriankluge.hobbyhub.mtg.meta.entity.MtgMetaCategory;
import dev.adriankluge.hobbyhub.mtg.meta.entity.MtgMetaEntry;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MtgMetaEntryRepository extends JpaRepository<MtgMetaEntry, UUID> {

    List<MtgMetaEntry> findByCategoryOrderBySortOrderAsc(MtgMetaCategory category);

    void deleteByCategory(MtgMetaCategory category);
}
