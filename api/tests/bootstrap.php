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
