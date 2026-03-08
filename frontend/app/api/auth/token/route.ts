import { auth } from "@/auth";
import { SignJWT } from "jose";
import { NextResponse } from "next/server";

/**
 * GET /api/auth/token
 *
 * Returns a short-lived HMAC-signed JWT (5 min) containing the user's session
 * data so client components can attach it as `Authorization: Bearer <token>`
 * when calling the Express backend on a different domain.
 *
 * Why this exists:
 *   In production the frontend (Vercel) and backend (Render) live on different
 *   domains. Browsers enforce SameSite=Lax, so the Auth.js session cookie is
 *   never sent cross-domain. This endpoint bridges the gap: it is a same-origin
 *   Next.js route so it always has cookie access, then signs a portable JWT
 *   (HS256) that the backend can verify with the shared AUTH_SECRET via jose.
 */
export const GET = auth(async (req) => {
    const session = req.auth;

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const secret = process.env.AUTH_SECRET;
    if (!secret) {
        return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const secretKey = new TextEncoder().encode(secret);

    // Short-lived token — enough for one API call cycle.
    const token = await new SignJWT({
        sub: session.user.id,
        email: session.user.email ?? undefined,
        name: session.user.name ?? undefined,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(secretKey);

    return NextResponse.json(
        { token },
        { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
});
