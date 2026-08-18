<?php

require_once __DIR__ . '/db.php';

/**
 * Spiel-des-Jahres results for the boardgame lookup's pre-search panel (#105).
 * Read from the hand-maintained sdj_awards table - three pots per year, each
 * with one winner (carrying BGG's id) plus its nominee and recommendation
 * names. The panel shows the latest award_year present, so seeding next year's
 * rows switches it over with no code change. No external call: this is local
 * curated data layered over the read-only BGG mirror, like the news fallbacks.
 */
final class SdjAwards
{
    /**
     * The latest year's results, grouped by category in seeded (sort_order)
     * order:
     *   ['year' => 2026, 'categories' => [
     *       ['category' => 'Spiel des Jahres',
     *        'winner' => ['bggId' => 400495, 'name' => 'DITO!'],
     *        'nominees' => ['Cozy Sticker Ville', ...],
     *        'recommended' => ['Hot Streak', ...]],
     *       ...
     *   ]]
     * An un-seeded table returns ['year' => null, 'categories' => []] so the
     * page renders nothing rather than an empty panel.
     */
    public function current(): array
    {
        $year = db()->query('SELECT MAX(award_year) FROM sdj_awards')->fetchColumn();
        if ($year === null || $year === false) {
            return ['year' => null, 'categories' => []];
        }
        $year = (int) $year;

        $stmt = db()->prepare(
            'SELECT category, kind, name, bgg_id FROM sdj_awards'
                . ' WHERE award_year = ? ORDER BY sort_order ASC'
        );
        $stmt->execute([$year]);
        $rows = $stmt->fetchAll();

        // Ordered map category -> pot; first-seen order follows sort_order, so
        // the three pots come out in the order they were seeded.
        $categories = [];
        foreach ($rows as $row) {
            $cat = (string) $row['category'];
            if (!isset($categories[$cat])) {
                $categories[$cat] = [
                    'category' => $cat,
                    'winner' => null,
                    'nominees' => [],
                    'recommended' => [],
                ];
            }
            $name = (string) $row['name'];
            switch ((string) $row['kind']) {
                case 'winner':
                    $categories[$cat]['winner'] = [
                        'bggId' => $row['bgg_id'] === null ? null : (int) $row['bgg_id'],
                        'name' => $name,
                    ];
                    break;
                case 'nominee':
                    $categories[$cat]['nominees'][] = $name;
                    break;
                case 'recommended':
                    $categories[$cat]['recommended'][] = $name;
                    break;
            }
        }

        // The panel's headline is the winner button, so a pot with no winner is
        // malformed seed data, not a renderable card - drop it.
        $categories = array_values(array_filter(
            $categories,
            fn(array $c) => $c['winner'] !== null
        ));

        return ['year' => $year, 'categories' => $categories];
    }
}
