<?php
// Points at a real MySQL/MariaDB instance - schema.sql applied, same as
// local docker-compose - rather than mocking the database. Only outbound
// third-party HTTP calls get faked (see each test's injected callable).
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
