/**
 * Thin fetch wrapper - no auth left in this app (see docs/adr/0009), so
 * this is just JSON parsing + a typed error, not the token/refresh dance
 * an earlier version of this file had.
 */

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;

  constructor(status: number, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, { ...options, headers });

  if (!response.ok) {
    let body: { message?: string; fieldErrors?: Record<string, string> } = {};
    try {
      body = await response.json();
    } catch {
      // Non-JSON error body - fall through to the generic message below.
    }
    throw new ApiError(response.status, body.message ?? "Request failed", body.fieldErrors);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}
