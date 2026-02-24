const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * Fetch wrapper for the Express backend.
 * Sends cookies (Auth.js session) automatically via credentials: "include".
 *
 * Usage:
 *   const data = await apiFetch("/api/user");
 */
export async function apiFetch(path: string, options: RequestInit = {}) {
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error.error || "API request failed");
    }

    return res.json();
}
