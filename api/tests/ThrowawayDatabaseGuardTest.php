<?php

use PHPUnit\Framework\TestCase;

// The guard itself lives in bootstrap.php, which PHPUnit has already loaded by
// the time this runs - it has to be there, because it must fire before any
// other test's setUp() issues its first DELETE.
final class ThrowawayDatabaseGuardTest extends TestCase
{
    public function testAcceptsDatabasesThatAnnounceThemselvesAsThrowaway(): void
    {
        foreach (['hobbyhub_test', 'test_hobbyhub', 'hh_test_db', 'HOBBYHUB_TEST'] as $name) {
            assert_throwaway_database($name, '127.0.0.1');
            $this->addToAssertionCount(1);
        }
    }

    // The failure this exists to prevent: a bind-mounted config.local.php
    // silently resolving the connection to the production database, with a
    // suite that DELETEs from every table it touches (#44, #45).
    public function testRefusesADatabaseThatIsNotMarkedAsATestOne(): void
    {
        $this->expectException(RuntimeException::class);

        assert_throwaway_database('hobbyhub', 'db.example.com');
    }

    public function testTheRefusalNamesTheDatabaseAndHostItWasAbout(): void
    {
        try {
            assert_throwaway_database('hobbyhub', 'db.example.com');
            $this->fail('expected the guard to refuse');
        } catch (RuntimeException $e) {
            // Whoever hits this needs to know which connection was resolved,
            // not just that something was wrong.
            $this->assertStringContainsString('hobbyhub', $e->getMessage());
            $this->assertStringContainsString('db.example.com', $e->getMessage());
        }
    }

    // "contest", "latest" and friends must not read as a test database.
    public function testDoesNotTreatAnIncidentalSubstringAsAMarker(): void
    {
        $this->expectException(RuntimeException::class);

        assert_throwaway_database('contested_data', '127.0.0.1');
    }
}
