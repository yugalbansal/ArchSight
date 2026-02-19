import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * Hook that returns a fetch wrapper with Clerk JWT token attached.
 * Usage:
 *   const { apiFetch } = useApi();
 *   const data = await apiFetch("/api/user");
 */
export function useApi() {
    const { getToken } = useAuth();

    const apiFetch = async (path: string, options: RequestInit = {}) => {
        const token = await getToken();

        const res = await fetch(`${API_URL}${path}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...options.headers,
            },
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(error.error || "API request failed");
        }

        return res.json();
    };

    return { apiFetch };
}
