<?php
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/db.php';

$stmt = db()->prepare(
    'SELECT headline, teaser, url, published_at FROM news_items WHERE source = ? ORDER BY sort_order ASC'
);
$stmt->execute(['WOTC']);
json_response(array_map(function ($row) {
    return [
        'headline' => $row['headline'],
        'teaser' => $row['teaser'],
        'url' => $row['url'],
        'publishedAt' => $row['published_at'],
    ];
}, $stmt->fetchAll()));
