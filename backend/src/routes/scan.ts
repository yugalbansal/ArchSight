import { Router } from "express";
import { getAuthSession } from "../lib/auth-middleware.js";
import { scanQueue, SCAN_QUEUE_NAME } from "../queue/index.js";
import { ScanModel } from "../models/scan.model.js";
import { prisma } from "../lib/db.js";

const router = Router();

/**
 * POST /api/scan
 * Queue a new repository scan job.
 */
router.post("/", async (req, res) => {
    try {
        const session = await getAuthSession(req);
        if (!session?.user) {
            return res.status(401).json({ error: "Unauthorized. Please log in." });
        }

        const { owner, repo, branch = "main", token } = req.body;

        if (!owner || !repo) {
            return res.status(400).json({ error: "Missing required fields: owner, repo" });
        }

        // 1. Create a pending record in MongoDB
        const scanId = await ScanModel.createPendingScan(owner, repo, branch, session.user.id);

        // Map GitHub App Installation scoping based on user ID
        let installation_id: number | undefined = undefined;
        try {
            const install = await prisma.gitHubInstallation.findFirst({
                where: { userId: session.user.id }
            });
            if (install?.installationId) {
                installation_id = install.installationId;
            }
        } catch (e) {
            console.warn("[API:Scan] Could not map user to GitHub App installation", e);
        }

        // 2. Add the job to the Redis Queue
        // BullMQ will assign this to a Worker process automatically
        await scanQueue.add(
            "scan-repository", // Job name identifier
            {
                scanId: scanId.toString(),
                owner,
                repo,
                branch,
                token,
                installation_id
            },
            {
                jobId: scanId.toString(), // Prevent duplicates and tie BullMQ Job ID to Mongo Scan ID
            }
        );

        console.log(`[API:Scan] Enqueued Job ${scanId.toString()} for ${owner}/${repo}`);

        // 3. Immediately respond with the Scan ID so the frontend can start polling
        res.status(202).json({
            message: "Scan successfully queued for processing.",
            scan_id: scanId.toString(),
            status: "pending"
        });

    } catch (error) {
        console.error("[API:Scan] Failed to queue job:", error);
        res.status(500).json({ error: "Internal Server Error while queueing scan job." });
    }
});

/**
 * GET /api/scan/history
 * Alias for /api/scan/user/all - Fetch all scans belonging to the current user.
 */
router.get("/history", async (req, res) => {
    try {
        const session = await getAuthSession(req);
        if (!session?.user?.id) {
            return res.status(401).json({ error: "Unauthorized. Please log in." });
        }

        const scans = await ScanModel.getByUserId(session.user.id);
        res.status(200).json({ scans });
    } catch (error) {
        console.error("[API:Scan] Failed to fetch user scans:", error);
        res.status(500).json({ error: "Internal Server Error fetching historical scans." });
    }
});

/**
 * GET /api/scan/user/all
 * Fetch all scans belonging to the current user.
 */
router.get("/user/all", async (req, res) => {
    try {
        const session = await getAuthSession(req);
        if (!session?.user?.id) {
            return res.status(401).json({ error: "Unauthorized. Please log in." });
        }

        const scans = await ScanModel.getByUserId(session.user.id);
        res.status(200).json({ scans });
    } catch (error) {
        console.error("[API:Scan] Failed to fetch user scans:", error);
        res.status(500).json({ error: "Internal Server Error fetching historical scans." });
    }
});

/**
 * GET /api/scan/:id
 * Fetch the real-time status and payload of a scan.
 */
router.get("/:id", async (req, res) => {
    try {
        const session = await getAuthSession(req);
        if (!session?.user) {
            return res.status(401).json({ error: "Unauthorized. Please log in." });
        }

        const scanId = req.params.id;
        const scan = await ScanModel.getById(scanId);

        if (!scan) {
            return res.status(404).json({ error: "Scan not found." });
        }

        // Optional: Ensure the user requesting it is the owner
        if (scan.user_id !== session.user.id) {
            return res.status(403).json({ error: "Forbidden. This scan does not belong to you." });
        }

        res.status(200).json({ scan });
    } catch (error) {
        console.error("[API:Scan] Failed to fetch scan status:", error);
        res.status(500).json({ error: "Internal Server Error fetching scan status." });
    }
});

/**
 * POST /api/scan/:id/cancel
 * Cancel a pending or in-progress scan.
 */
router.post("/:id/cancel", async (req, res) => {
    try {
        const session = await getAuthSession(req);
        if (!session?.user) {
            return res.status(401).json({ error: "Unauthorized. Please log in." });
        }

        const scanId = req.params.id;
        const scan = await ScanModel.getById(scanId);

        if (!scan) {
            return res.status(404).json({ error: "Scan not found." });
        }

        if (scan.user_id !== session.user.id) {
            return res.status(403).json({ error: "Forbidden. This scan does not belong to you." });
        }

        if (["completed", "failed"].includes(scan.status)) {
            return res.status(400).json({ error: "Scan is already finished and cannot be cancelled." });
        }

        // Try to remove the job from the queue (succeeds if still waiting)
        try {
            const job = await scanQueue.getJob(scanId);
            if (job) {
                await job.remove();
                console.log(`[API:Scan:Cancel] Removed queued job ${scanId}`);
            }
        } catch (queueErr) {
            console.warn(`[API:Scan:Cancel] Could not remove job from queue (may be active):`, queueErr);
        }

        // Mark scan as failed / cancelled in MongoDB regardless
        await ScanModel.markFailed(scanId, "Scan cancelled by user.");

        console.log(`[API:Scan:Cancel] Scan ${scanId} cancelled by user ${session.user.id}`);
        res.status(200).json({ message: "Scan cancelled successfully.", scan_id: scanId });

    } catch (error) {
        console.error("[API:Scan:Cancel] Failed to cancel scan:", error);
        res.status(500).json({ error: "Internal Server Error while cancelling scan." });
    }
});

export default router;
