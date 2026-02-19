import { Router, Request, Response } from "express";
import { Webhook } from "svix";
import { supabase } from "../lib/supabase.js";

const router = Router();

interface ClerkUserEvent {
    data: {
        id: string;
        email_addresses: Array<{
            id: string;
            email_address: string;
        }>;
        first_name: string | null;
        last_name: string | null;
        image_url: string | null;
        external_accounts?: Array<{
            provider: string;
        }>;
        created_at: number;
        updated_at: number;
    };
    type: string;
}

// POST /api/webhook/clerk
// Clerk sends user.created / user.updated events here
router.post("/", async (req: Request, res: Response) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.warn("⚠️  CLERK_WEBHOOK_SECRET not set, skipping verification");
        // In development without webhook secret, still process the event
    }

    // Verify webhook signature if secret is available
    if (webhookSecret) {
        const svixId = req.headers["svix-id"] as string;
        const svixTimestamp = req.headers["svix-timestamp"] as string;
        const svixSignature = req.headers["svix-signature"] as string;

        if (!svixId || !svixTimestamp || !svixSignature) {
            res.status(400).json({ error: "Missing svix headers" });
            return;
        }

        try {
            const wh = new Webhook(webhookSecret);
            wh.verify(JSON.stringify(req.body), {
                "svix-id": svixId,
                "svix-timestamp": svixTimestamp,
                "svix-signature": svixSignature,
            });
        } catch (err) {
            console.error("Webhook verification failed:", err);
            res.status(400).json({ error: "Webhook verification failed" });
            return;
        }
    }

    const event = req.body as ClerkUserEvent;

    if (event.type === "user.created" || event.type === "user.updated") {
        const { data } = event;
        const primaryEmail = data.email_addresses?.[0]?.email_address;
        const provider = data.external_accounts?.[0]?.provider || "email";
        const fullName = [data.first_name, data.last_name]
            .filter(Boolean)
            .join(" ");

        try {
            const { error } = await supabase.from("users").upsert(
                {
                    clerk_id: data.id,
                    email: primaryEmail,
                    name: fullName || null,
                    avatar_url: data.image_url,
                    provider,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "clerk_id" }
            );

            if (error) {
                console.error("Supabase upsert error:", error);
                res.status(500).json({ error: "Failed to sync user" });
                return;
            }

            console.log(`✅ User ${event.type}: ${primaryEmail} (${data.id})`);
            res.status(200).json({ success: true });
        } catch (err) {
            console.error("Webhook handler error:", err);
            res.status(500).json({ error: "Internal server error" });
        }
    } else {
        // Acknowledge but ignore other event types
        res.status(200).json({ received: true });
    }
});

export default router;
