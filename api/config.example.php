<?php
// Copy to config.local.php (gitignored) and fill in real values for a
// production deployment. Local docker-compose dev doesn't need this file -
// it gets DB_HOST/DB_NAME/DB_USER/DB_PASSWORD from container environment
// variables instead (see docker-compose.yml). IONOS shared hosting has no
// UI for setting PHP environment variables, so config.local.php is the
// production equivalent - define whichever constants below need a
// non-default value; config.php only fills in ones that aren't already
// defined.

// define('DB_HOST', 'localhost');
// define('DB_NAME', 'dbXXXXXXXX');
// define('DB_USER', 'dbXXXXXXXX');
// define('DB_PASSWORD', 'real-password-here');

// BoardGameGeek application token (see issue #40). Without it the XML API
// answers 401 and board game lookups fall back to the imported bgg_ranks
// dump - rating and name only, no description or comments.
// define('BGG_API_TOKEN', 'token-from-boardgamegeek.com/using_the_xml_api');
