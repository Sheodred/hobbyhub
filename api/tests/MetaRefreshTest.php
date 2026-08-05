<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/MetaRefresh.php';

final class MetaRefreshTest extends TestCase
{
    private const CATEGORY = 'TEST_CATEGORY';

    protected function setUp(): void
    {
        db()->prepare('DELETE FROM mtg_meta_entries WHERE category = ?')->execute([self::CATEGORY]);
    }

    public function testReplaceMetaReplacesOldEntriesOnSuccess(): void
    {
        $pdo = db();

        replace_meta($pdo, self::CATEGORY, [
            ['name' => 'Old Card', 'url' => 'https://example.com/old', 'numDecks' => 1],
        ]);
        replace_meta($pdo, self::CATEGORY, [
            ['name' => 'Sol Ring', 'url' => 'https://example.com/sol-ring', 'numDecks' => 223511],
            ['name' => 'Arcane Signet', 'url' => 'https://example.com/arcane-signet', 'numDecks' => 188624],
        ]);

        $rows = $pdo->prepare('SELECT name, num_decks, sort_order FROM mtg_meta_entries WHERE category = ? ORDER BY sort_order ASC');
        $rows->execute([self::CATEGORY]);
        $rows = $rows->fetchAll();

        $this->assertCount(2, $rows, 'the old entry must be gone, replaced entirely by the new batch');
        $this->assertSame('Sol Ring', $rows[0]['name']);
        $this->assertSame(223511, (int) $rows[0]['num_decks']);
        $this->assertSame(0, (int) $rows[0]['sort_order']);
        $this->assertSame('Arcane Signet', $rows[1]['name']);
    }

    public function testFailedInsertRollsBackAndKeepsTheExistingCache(): void
    {
        $pdo = db();

        replace_meta($pdo, self::CATEGORY, [
            ['name' => 'Still here after a failed refresh', 'url' => 'https://example.com/kept', 'numDecks' => 1],
        ]);

        try {
            replace_meta($pdo, self::CATEGORY, [
                // name is NOT NULL in the schema - this violates that
                // constraint mid-transaction, forcing the rollback path.
                ['name' => null, 'url' => 'https://example.com/bad', 'numDecks' => 1],
            ]);
            $this->fail('expected the NOT NULL violation to throw');
        } catch (Throwable $e) {
            // expected - replace_meta() re-throws after rolling back, exactly
            // like the cron script's own per-category catch block.
        }

        $rows = $pdo->prepare('SELECT name FROM mtg_meta_entries WHERE category = ?');
        $rows->execute([self::CATEGORY]);
        $rows = $rows->fetchAll();

        $this->assertCount(1, $rows);
        $this->assertSame('Still here after a failed refresh', $rows[0]['name']);
    }
}
