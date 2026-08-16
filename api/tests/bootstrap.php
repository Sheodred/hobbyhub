<?php
// Points at a real MySQL/MariaDB instance - schema.sql applied, same as
// local docker-compose - rather than mocking the database. Only outbound
// third-party HTTP calls get faked (see each test's injected callable).
//
// Point this at a THROWAWAY database, never at the docker-compose `mariadb`
// dev instance: several tests DELETE FROM the tables they exercise in
// setUp(), so a run against the dev database silently wipes real local data
// (this cost a 180k-row bgg_ranks import once). Spin one up alongside the
// compose stack:
//
//   docker run -d --name hh-test-db --network hobbyhub_default \
//     -e MARIADB_DATABASE=hobbyhub_test -e MARIADB_USER=hobbyhub_test \
//     -e MARIADB_PASSWORD=hobbyhub_test -e MARIADB_RANDOM_ROOT_PASSWORD=yes mariadb:10
//   docker exec -i hh-test-db mysql -uhobbyhub_test -phobbyhub_test hobbyhub_test < api/sql/schema.sql
//
// then run phpunit with DB_HOST=hh-test-db DB_NAME/USER/PASSWORD=hobbyhub_test.
// CI provides its own DB_HOST/etc. via a service container; these are
// just the local-run defaults, matching config.php's env_or() convention.
foreach ([
    'DB_HOST' => '127.0.0.1',
    'DB_NAME' => 'hobbyhub_test',
    'DB_USER' => 'hobbyhub_test',
    'DB_PASSWORD' => 'hobbyhub_test',
] as $name => $default) {
    if (getenv($name) === false) {
        putenv("$name=$default");
    }
}

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../lib/db.php';

/**
 * Refuse to run against anything that doesn't announce itself as throwaway.
 *
 * The comment above is advice; this is enforcement. Several tests DELETE FROM
 * the tables they exercise in setUp(), and the ways to end up pointed at a real
 * database are quieter than they look: config.php resolves DB_* through
 * env_or(), so a config file that defines the constants first wins over the
 * environment - and a bind mount can put such a file back inside a container
 * that .dockerignore had deliberately excluded from the image (#44, #45).
 *
 * A name check is crude, but it is the only signal available before the first
 * query runs, and it is the one thing every throwaway database here has in
 * common (local `hobbyhub_test`, CI's `hobbyhub_test`).
 */
function assert_throwaway_database(string $database, string $host): void
{
    // Anchored to a word boundary so "contested_data" isn't mistaken for one.
    if (preg_match('/(^|[^a-z])test([^a-z]|$)/i', $database)) {
        return;
    }

    throw new RuntimeException(
        "Refusing to run the test suite against database '{$database}' on host '{$host}'.\n"
        . "This suite DELETEs from the tables it touches, so it only runs against a\n"
        . "database whose name says it is disposable (it must contain 'test').\n"
        . "If DB_NAME looks wrong, check for an api/config.local.php shadowing the\n"
        . "environment - see api/tests/bootstrap.php for the throwaway DB setup."
    );
}

assert_throwaway_database(DB_NAME, DB_HOST);
