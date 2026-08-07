<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/ReplaceRows.php';

final class ReplaceRowsTest extends TestCase
{
    private const SOURCE = 'TEST_SOURCE';

    protected function setUp(): void
    {
        db()->prepare('DELETE FROM news_items WHERE source = ?')->execute([self::SOURCE]);
    }

    public function testReplacesOldRowsWithNewBatchOnSuccess(): void
    {
        $pdo = db();

        replace_rows(
            $pdo,
            'news_items',
            'source',
            self::SOURCE,
            ['source', 'headline', 'teaser', 'url', 'published_at', 'sort_order'],
            [['headline' => 'Old headline']],
            fn($row, $i) => [self::SOURCE, $row['headline'], null, 'https://example.com/old', null, $i],
        );
        replace_rows(
            $pdo,
            'news_items',
            'source',
            self::SOURCE,
            ['source', 'headline', 'teaser', 'url', 'published_at', 'sort_order'],
            [['headline' => 'New headline']],
            fn($row, $i) => [self::SOURCE, $row['headline'], null, 'https://example.com/new', null, $i],
        );

        $rows = $pdo->prepare('SELECT headline FROM news_items WHERE source = ?');
        $rows->execute([self::SOURCE]);
        $rows = $rows->fetchAll();

        $this->assertCount(1, $rows, 'the old row must be gone, replaced entirely by the new batch');
        $this->assertSame('New headline', $rows[0]['headline']);
    }

    public function testFailedInsertRollsBackAndKeepsTheExistingRows(): void
    {
        $pdo = db();

        replace_rows(
            $pdo,
            'news_items',
            'source',
            self::SOURCE,
            ['source', 'headline', 'teaser', 'url', 'published_at', 'sort_order'],
            [['headline' => 'Still here after a failed refresh']],
            fn($row, $i) => [self::SOURCE, $row['headline'], null, 'https://example.com/kept', null, $i],
        );

        try {
            replace_rows(
                $pdo,
                'news_items',
                'source',
                self::SOURCE,
                ['source', 'headline', 'teaser', 'url', 'published_at', 'sort_order'],
                // headline is NOT NULL in the schema - this violates that
                // constraint mid-transaction, forcing the rollback path.
                [['headline' => null]],
                fn($row, $i) => [self::SOURCE, $row['headline'], null, 'https://example.com/bad', null, $i],
            );
            $this->fail('expected the NOT NULL violation to throw');
        } catch (Throwable $e) {
            // expected - replace_rows() re-throws after rolling back.
        }

        $rows = $pdo->prepare('SELECT headline FROM news_items WHERE source = ?');
        $rows->execute([self::SOURCE]);
        $rows = $rows->fetchAll();

        $this->assertCount(1, $rows);
        $this->assertSame('Still here after a failed refresh', $rows[0]['headline']);
    }
}
