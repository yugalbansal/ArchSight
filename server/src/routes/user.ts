import { Router, Request, Response } from "express";
import { requireAuth, getAuth } from "@clerk/express";
import { clerkClient } from "@clerk/express";
import { supabase } from "../lib/supabase.js";

const router = Router();

// GET /api/user — Get current authenticated user from Supabase
// Falls back to syncing from Clerk if not found in Supabase
router.get("/", requireAuth(), async (req: Request, res: Response) => {
    const auth = getAuth(req);
    const clerkUserId = auth.userId;

    if (!clerkUserId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }

    console.log(`📥 GET /api/user — Clerk ID: ${clerkUserId}`);

    try {
        // Try fetching from Supabase first
        const { data: user, error } = await supabase
            .from("users")
            .select("*")
            .eq("clerk_id", clerkUserId)
            .single();

        if (user && !error) {
            console.log(`  ✅ Found in Supabase: ${user.email}`);
            res.json({ user });
            return;
        }

        console.log(`  🔄 Not in Supabase, syncing from Clerk...`);

        // Fallback: sync from Clerk if not in Supabase
        const clerkUser = await clerkClient.users.getUser(clerkUserId);
        const primaryEmail = clerkUser.emailAddresses?.[0]?.emailAddress;
        const provider =
            clerkUser.externalAccounts?.[0]?.provider || "email";
        const fullName = [clerkUser.firstName, clerkUser.lastName]
            .filter(Boolean)
            .join(" ");

        console.log(`  📝 Creating user: ${primaryEmail} (${provider})`);

        const { data: newUser, error: upsertError } = await supabase
            .from("users")
            .upsert(
                {
                    clerk_id: clerkUserId,
                    email: primaryEmail,
                    name: fullName || null,
                    avatar_url: clerkUser.imageUrl,
                    provider,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "clerk_id" }
            )
            .select()
            .single();

        if (upsertError) {
            console.error("  ❌ Supabase upsert error:", upsertError);
            // Still return Clerk data even if Supabase fails
            res.json({
                user: {
                    clerk_id: clerkUserId,
                    email: primaryEmail,
                    name: fullName,
                    avatar_url: clerkUser.imageUrl,
                    provider,
                },
            });
            return;
        }

        console.log(`  ✅ User created in Supabase: ${primaryEmail}`);
        res.json({ user: newUser });
    } catch (err) {
        console.error("  ❌ Error fetching user:", err);
        res.status(500).json({ error: "Failed to fetch user" });
    }
});

// PUT /api/user — Update user profile in Supabase
router.put("/", requireAuth(), async (req: Request, res: Response) => {
    const auth = getAuth(req);
    const clerkUserId = auth.userId;

    if (!clerkUserId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }

    const { name } = req.body;

    try {
        const { data: user, error } = await supabase
            .from("users")
            .update({
                name,
                updated_at: new Date().toISOString(),
            })
            .eq("clerk_id", clerkUserId)
            .select()
            .single();

        if (error) {
            console.error("Supabase update error:", error);
            res.status(500).json({ error: "Failed to update user" });
            return;
        }

        res.json({ user });
    } catch (err) {
        console.error("Error updating user:", err);
        res.status(500).json({ error: "Failed to update user" });
    }
});

export default router;
