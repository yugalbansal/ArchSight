import { getSession } from "@auth/express";
import { jwtVerify } from "jose";
import { authConfig } from "./auth-config.js";
import type { Request } from "express";

export interface AuthSession {
    user: {
        id: string;
        email?: string | null;
        name?: string | null;
        image?: string | null;
    };
}

/**
 * getAuthSession
 *
 * Drop-in replacement for `getSession(req, authConfig)` that also accepts a
 * Bearer token in the `Authorization` header.
 *
 * Why this is needed:
 *   In production the frontend (Vercel) and backend (Render) live on different
 *   domains. Browsers refuse to send cross-site cookies (SameSite=Lax), so the
 *   standard cookie-based `getSession()` always returns null → 401.
 *
 *   The frontend fetches a short-lived HS256 JWT from the Next.js
 *   `/api/auth/token` route (which uses `auth()` server-side so cookies always
 *   work) and sends it as `Authorization: Bearer <token>`. Both services share
 *   AUTH_SECRET so the backend verifies it with jose directly — no Auth.js
 *   internal format or version dependencies.
 *
 * Fallback order:
 *   1. Cookie-based session  (localhost / same-domain)
 *   2. Bearer HS256 JWT in Authorization header (cross-domain production)
 */
export async function getAuthSession(req: Request): Promise<AuthSession | null> {
    // ── 1. Cookie-based session (works on localhost) ──────────────────────────
    try {
        const session = await getSession(req, authConfig);
        if (session?.user?.id) {
            return session as AuthSession;
        }
    } catch {
        // Ignore and fall through to Bearer token approach
    }

    // ── 2. Bearer JWT fallback (cross-domain production) ──────────────────────
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return null;
    }

    const rawToken = authHeader.substring(7).trim();
    const secret = process.env.AUTH_SECRET;

    if (!rawToken || !secret) {
        return null;
    }

    try {
        const secretKey = new TextEncoder().encode(secret);
        const { payload } = await jwtVerify(rawToken, secretKey, {
            algorithms: ["HS256"],
        });

        const userId = payload.sub as string | undefined;
        if (!userId) return null;

        return {
            user: {
                id: userId,
                email: (payload.email as string) ?? null,
                name: (payload.name as string) ?? null,
                image: null,
            },
        };
    } catch (err) {
        console.warn("[Auth] Bearer token verification failed:", (err as Error).message);
        return null;
    }
}
