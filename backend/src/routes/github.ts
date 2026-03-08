import { Router } from "express";
import { getAuthSession } from "../lib/auth-middleware.js";
import { githubApp, getInstallationOctokit } from "../lib/github.js";
import { prisma } from "../lib/db.js";

const router = Router();

/**
 * POST /api/github/installation
 * Called by the frontend after a user installs the GitHub App.
 * Maps the installation_id to the logged-in User's ID.
 */
router.post("/installation", async (req, res) => {
    try {
        const session = await getAuthSession(req);
        if (!session?.user?.id) return res.status(401).json({ error: "Unauthorized" });

        const { installation_id } = req.body;
        if (!installation_id) return res.status(400).json({ error: "Missing installation_id" });

        const userId = session.user.id;

        // Upsert the installation map
        await prisma.gitHubInstallation.upsert({
            where: {
                userId_installationId: {
                    userId,
                    installationId: Number(installation_id)
                }
            },
            update: {},
            create: {
                userId,
                installationId: Number(installation_id),
                provider: "github"
            }
        });

        res.status(200).json({ success: true, installation_id });
    } catch (error) {
        console.error("[GitHub API] Failed to map installation:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * GET /api/github/repositories
 * Lists all repositories the user has granted the App access to across all their installations.
 */
router.get("/repositories", async (req, res) => {
    try {
        const session = await getAuthSession(req);
        if (!session?.user?.id) return res.status(401).json({ error: "Unauthorized" });

        const userId = session.user.id;

        // Find all installation IDs for this user
        const userInstalls = await prisma.gitHubInstallation.findMany({ where: { userId } });
        if (!userInstalls.length) {
            return res.status(200).json({ repositories: [] });
        }

        const allRepositories = [];

        // Fetch repos for each installation
        for (const install of userInstalls) {
            try {
                const octokit = await getInstallationOctokit(install.installationId);
                const { data } = await octokit.request("GET /installation/repositories", {
                    per_page: 100
                });

                // Map the heavy GitHub payload into something lightweight for the UI
                const repos = data.repositories.map((r: any) => ({
                    id: r.id,
                    name: r.name,
                    full_name: r.full_name,
                    owner: r.owner.login,
                    private: r.private,
                    html_url: r.html_url,
                    default_branch: r.default_branch,
                    installation_id: install.installationId // Keep track of which installation this repo belongs to
                }));

                allRepositories.push(...repos);
            } catch (installErr) {
                console.warn(`[GitHub API] Failed to fetch repos for installation ${install.installationId}. It may have been uninstalled.`, installErr);
            }
        }

        res.status(200).json({ repositories: allRepositories });
    } catch (error) {
        console.error("[GitHub API] Failed to fetch repositories:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * POST /api/github/webhook
 * Listens for repository events (like 'push') directly from the GitHub App.
 * Automatically verifies the payload cryptographic signature.
 */
router.post("/webhook", async (req, res) => {
    try {
        const id = req.headers["x-github-delivery"] as string;
        const name = req.headers["x-github-event"] as string;
        const signature = req.headers["x-hub-signature-256"] as string;
        const payload = req.body;

        await githubApp.webhooks.verifyAndReceive({
            id,
            name: name as any,
            payload: typeof payload === "string" ? payload : JSON.stringify(payload),
            signature,
        });

        res.status(200).send("ok");
    } catch (error: any) {
        console.error("[GitHub Webhook] Signature verification failed or event error:", error.message);
        res.status(400).send(`Webhook Error: ${error.message}`);
    }
});

export default router;
