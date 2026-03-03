import { Router, Request, Response } from "express";
import { getSession } from "@auth/express";
import { authConfig } from "../lib/auth-config.js";
import { prisma } from "../lib/db.js";
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

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
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

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
                createdAt: user.emailVerified, // Temporary Prisma fallback if metadata missing 
                updatedAt: new Date(),
            },
        });
    } catch (err) {
        console.error("Error fetching user:", err);
        res.status(500).json({ error: "Failed to fetch user" });
    }
});

// PUT /api/user — Update user profile
router.put("/", requireAuth, async (req: Request, res: Response) => {
    const session = res.locals.session;
    const userId = session.user.id;
    const { name } = req.body;

    try {
        const result = await prisma.user.update({
            where: { id: userId },
            data: { name }
        });

        if (!result) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        res.json({
            user: {
                id: result.id,
                email: result.email,
                name: result.name,
                image: result.image,
                updatedAt: new Date(),
            },
        });
    } catch (err) {
        console.error("Error updating user:", err);
        res.status(500).json({ error: "Failed to update user" });
    }
});

export default router;
