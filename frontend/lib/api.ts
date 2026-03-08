export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ─── Bearer token cache ───────────────────────────────────────────────────────
// In production the frontend (Vercel) and backend (Render) live on different
// domains. Browsers block cross-site cookies (SameSite=Lax), so the backend
// can't read the Auth.js session cookie. Instead, we fetch the raw session JWT
// from our own Next.js API route and pass it as `Authorization: Bearer <token>`.
let _cachedToken: string | null = null;
let _tokenExpiry = 0;
const TOKEN_TTL_MS = 4 * 60 * 1000; // refresh ~4 min before default 30-min expiry

/**
 * Fetches the raw Auth.js session JWT from the Next.js `/api/auth/token` route.
 * The result is cached for TOKEN_TTL_MS to avoid an extra round-trip on every call.
 */
async function getAuthToken(): Promise<string | null> {
    if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;

    try {
        const res = await fetch("/api/auth/token", {
            credentials: "include",
            headers: { "Cache-Control": "no-cache" },
        });
        if (!res.ok) return null;
        const data = await res.json();
        _cachedToken = data.token ?? null;
        _tokenExpiry = Date.now() + TOKEN_TTL_MS;
        return _cachedToken;
    } catch {
        return null;
    }
}

/** Call this to force the token cache to refresh on next use (e.g. after sign-out). */
export function invalidateAuthTokenCache() {
    _cachedToken = null;
    _tokenExpiry = 0;
}

/**
 * Build request headers, injecting `Authorization: Bearer <token>` when a
 * valid session JWT is available. Falls back gracefully (no header) if not.
 */
async function buildAuthHeaders(
    extra?: HeadersInit
): Promise<Record<string, string>> {
    const token = await getAuthToken();
    return {
        "Content-Type": "application/json",
        ...(extra as Record<string, string>),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

// ─── Public helpers ───────────────────────────────────────────────────────────

/**
 * Fetch wrapper for the Express backend.
 * Automatically attaches the Auth.js Bearer token so requests work across
 * domains in production (Vercel → Render).
 *
 * Throws on non-2xx responses.
 *
 * Usage:
 *   const data = await apiFetch("/api/user");
 */
export async function apiFetch(path: string, options: RequestInit = {}) {
    const headers = await buildAuthHeaders(options.headers);

    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        credentials: "include",
        headers,
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error.error || "API request failed");
    }

    return res.json();
}

/**
 * Like the native `fetch` but automatically attaches the Auth.js Bearer token.
 * Returns the raw `Response` object so callers can inspect `response.ok`
 * and handle errors themselves.
 *
 * Usage:
 *   const res = await fetchWithAuth(`${API_URL}/api/scan`, { method: "POST", body: ... });
 *   if (!res.ok) { ... }
 */
export async function fetchWithAuth(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    const headers = await buildAuthHeaders(options.headers);

    return fetch(url, {
        ...options,
        credentials: "include",
        headers,
    });
}
