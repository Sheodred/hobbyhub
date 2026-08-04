/**
 * Fetch wrapper implementing the client side of docs/adr/0001: the access
 * token lives only in this module's memory (never localStorage), and every
 * request carries `credentials: "include"` so the httpOnly refresh cookie
 * goes along for the ride. A 401 triggers exactly one refresh attempt and
 * retry - concurrent 401s share a single in-flight refresh rather than each
 * firing their own.
 */

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;

  constructor(status: number, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

let refreshInFlight: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          setAccessToken(null);
          return null;
        }
        const data = await response.json();
        setAccessToken(data.accessToken);
        return data.accessToken as string;
      })
      .catch(() => {
        setAccessToken(null);
        return null;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const headers = new Headers(options.headers);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, { ...options, headers, credentials: "include" });

  if (response.status === 401 && !isRetry && path !== "/api/auth/refresh") {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFetch<T>(path, options, true);
    }
  }

  if (!response.ok) {
    let body: { message?: string; fieldErrors?: Record<string, string> } = {};
    try {
      body = await response.json();
    } catch {
      // Non-JSON error body (e.g. a plain 401 with no content) - fall through
      // to the generic message below.
    }
    throw new ApiError(response.status, body.message ?? "Request failed", body.fieldErrors);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}
