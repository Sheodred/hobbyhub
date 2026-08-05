<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/NewsRefresh.php';

final class NewsRefreshTest extends TestCase
{
    private const SOURCE = 'TEST_SOURCE';

    protected function setUp(): void
    {
        db()->prepare('DELETE FROM news_items WHERE source = ?')->execute([self::SOURCE]);
    }

    public function testReplaceNewsReplacesOldItemsOnSuccess(): void
    {
        $pdo = db();

        replace_news($pdo, self::SOURCE, [
            ['headline' => 'Old headline', 'teaser' => null, 'url' => 'https://example.com/old', 'publishedAt' => null],
        ]);
        replace_news($pdo, self::SOURCE, [
            ['headline' => 'New headline 1', 'teaser' => 'Teaser one', 'url' => 'https://example.com/1', 'publishedAt' => '2026-08-05T10:00:00Z'],
            ['headline' => 'New headline 2', 'teaser' => null, 'url' => 'https://example.com/2', 'publishedAt' => null],
        ]);

        $rows = $pdo->prepare('SELECT headline, sort_order FROM news_items WHERE source = ? ORDER BY sort_order ASC');
        $rows->execute([self::SOURCE]);
        $rows = $rows->fetchAll();

        $this->assertCount(2, $rows, 'the old headline must be gone, replaced entirely by the new batch');
        $this->assertSame('New headline 1', $rows[0]['headline']);
        $this->assertSame(0, (int) $rows[0]['sort_order']);
        $this->assertSame('New headline 2', $rows[1]['headline']);
        $this->assertSame(1, (int) $rows[1]['sort_order']);
    }

    public function testFailedInsertRollsBackAndKeepsTheExistingCache(): void
    {
        $pdo = db();

        replace_news($pdo, self::SOURCE, [
            ['headline' => 'Still here after a failed refresh', 'teaser' => null, 'url' => 'https://example.com/kept', 'publishedAt' => null],
        ]);

        try {
            replace_news($pdo, self::SOURCE, [
                // headline is NOT NULL in the schema - this violates that
                // constraint mid-transaction, forcing the rollback path.
                ['headline' => null, 'teaser' => null, 'url' => 'https://example.com/bad', 'publishedAt' => null],
            ]);
            $this->fail('expected the NOT NULL violation to throw');
        } catch (Throwable $e) {
            // expected - replace_news() re-throws after rolling back, exactly
            // like the cron script's own catch block that logs and moves on.
        }

        $rows = $pdo->prepare('SELECT headline FROM news_items WHERE source = ?');
        $rows->execute([self::SOURCE]);
        $rows = $rows->fetchAll();

        $this->assertCount(1, $rows);
        $this->assertSame('Still here after a failed refresh', $rows[0]['headline']);
    }
}
