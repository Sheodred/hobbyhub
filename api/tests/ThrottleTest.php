<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../lib/Throttle.php';

// Six clients carried this privately and none of them could test it.
final class ThrottleTest extends TestCase
{
    protected function setUp(): void
    {
        db()->exec('DELETE FROM bgq_throttle');
    }

    public function testFirstCallDoesNotWaitAndRecordsTheTime(): void
    {
        $before = microtime(true);
        throttle('bgq_throttle', 1000);
        $elapsedMs = (microtime(true) - $before) * 1000;

        $this->assertLessThan(500, $elapsedMs, 'nothing to wait for on the first call');
        $this->assertNotFalse(db()->query('SELECT last_call_at FROM bgq_throttle WHERE id = 1')->fetchColumn());
    }

    public function testSecondCallWaitsOutTheRemainingInterval(): void
    {
        throttle('bgq_throttle', 200);

        $before = microtime(true);
        throttle('bgq_throttle', 200);
        $elapsedMs = (microtime(true) - $before) * 1000;

        $this->assertGreaterThan(100, $elapsedMs, 'the second call must be paced');
    }

    public function testAnOldEnoughLastCallIsNotWaitedOn(): void
    {
        db()->prepare('INSERT INTO bgq_throttle (id, last_call_at) VALUES (1, ?)')
            ->execute([microtime(true) - 10]);

        $before = microtime(true);
        throttle('bgq_throttle', 1000);
        $elapsedMs = (microtime(true) - $before) * 1000;

        $this->assertLessThan(500, $elapsedMs);
    }
}
