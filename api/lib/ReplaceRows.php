<?php
require_once __DIR__ . '/db.php';

// Delete-then-bulk-insert-in-a-transaction: replaces every row matching
// $whereColumn = $whereValue with a fresh batch. $toValues maps each row to
// the positional params for $columns, in order; fetched_at is always the
// last column, set to NOW().
function replace_rows(
    PDO $pdo,
    string $table,
    string $whereColumn,
    string $whereValue,
    array $columns,
    array $rows,
    callable $toValues
): void {
    $pdo->beginTransaction();
    try {
        $pdo->prepare("DELETE FROM $table WHERE $whereColumn = ?")->execute([$whereValue]);

        $placeholders = implode(', ', array_fill(0, count($columns), '?'));
        $columnList = implode(', ', $columns) . ', fetched_at';
        $insert = $pdo->prepare("INSERT INTO $table ($columnList) VALUES ($placeholders, NOW())");
        foreach ($rows as $i => $row) {
            $insert->execute($toValues($row, $i));
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}
