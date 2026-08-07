<?php
require_once __DIR__ . '/../lib/http.php';
require_once __DIR__ . '/../lib/db.php';

$stmt = db()->prepare(
    'SELECT headline, teaser, url, published_at FROM news_items
     WHERE source = ? AND published_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)
     ORDER BY published_at ASC'
);
$stmt->execute(['FLEAMARKET']);
json_response(array_map(function ($row) {
    return [
        'name' => $row['headline'],
        'location' => $row['teaser'],
        'url' => $row['url'],
        'date' => $row['published_at'],
    ];
}, $stmt->fetchAll()));
