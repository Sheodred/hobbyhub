<?php
// Response helpers - every endpoint uses these so the error shape stays
// {"message": "..."} with a real HTTP status, matching what the frontend's
// apiClient.ts ApiError parsing already expects (no frontend change needed).

function json_response($data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function error_response(string $message, int $status): void
{
    json_response(['message' => $message], $status);
}
