import { Router, Request, Response } from "express";
import { getSession } from "@auth/express";
import { authConfig } from "../lib/auth-config.js";
import client from "../lib/db.js";
import { ObjectId } from "mongodb";

const router = Router();

// Middleware: require authenticated session
async function requireAuth(req: Request, res: Response, next: Function) {
    const session = res.locals.session ?? (await getSession(req, authConfig));
    if (!session?.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    res.locals.session = session;
    next();
}

// GET /api/user — Get current authenticated user
router.get("/", requireAuth, async (_req: Request, res: Response) => {
    const session = res.locals.session;
    const userId = session.user.id;

    console.log(`📥 GET /api/user — User ID: ${userId}`);

    try {
        const db = client.db();
        const user = await db
            .collection("users")
            .findOne(
                { _id: new ObjectId(userId) },
                { projection: { password: 0 } }
            );

        if (!user) {
            console.log(`  ❌ User not found in DB`);
            // Return session data as fallback
            res.json({
                user: {
                    id: userId,
                    email: session.user.email,
                    name: session.user.name,
                    image: session.user.image,
                },
            });
            return;
        }

        console.log(`  ✅ Found user: ${user.email}`);
        res.json({
            user: {
                id: user._id.toString(),
                email: user.email,
                name: user.name,
                image: user.image,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        });
    } catch (err) {
        console.error("  ❌ Error fetching user:", err);
        res.status(500).json({ error: "Failed to fetch user" });
    }
});

// PUT /api/user — Update user profile
router.put("/", requireAuth, async (req: Request, res: Response) => {
    const session = res.locals.session;
    const userId = session.user.id;
    const { name } = req.body;

    try {
        const db = client.db();
        const result = await db.collection("users").findOneAndUpdate(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    name,
                    updatedAt: new Date(),
                },
            },
            { returnDocument: "after", projection: { password: 0 } }
        );

        if (!result) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        res.json({
            user: {
                id: result._id.toString(),
                email: result.email,
                name: result.name,
                image: result.image,
                updatedAt: result.updatedAt,
            },
        });
    } catch (err) {
        console.error("Error updating user:", err);
        res.status(500).json({ error: "Failed to update user" });
    }
});

export default router;
