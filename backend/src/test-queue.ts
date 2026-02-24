import { scanQueue } from "./queue/index.js";
import { ScanModel } from "./models/scan.model.js";

// Ensure DB connects
import { prisma } from "./lib/db.js";

async function testPushJob() {
    console.log("Pushing a real-world express codebase to the BullMQ REDIS queue...");
    const owner = "gothinkster";
    const repo = "node-express-realworld-example-app"; // Medium size repo (real framework)
    const branch = "master";

    try {
        const userId = "test-script";
        await prisma.user.upsert({
            where: { id: userId },
            update: {},
            create: { id: userId, email: "test@example.com" }
        });

        const scanId = await ScanModel.createPendingScan(owner, repo, branch, userId);

        await scanQueue.add("scan-repository", {
            scanId: scanId.toString(),
            owner,
            repo,
            branch
        }, { jobId: scanId.toString() });

        console.log(`✅ Job Added! Scan ID: ${scanId.toString()}`);
        console.log("Run the worker process in another terminal to process this job:");
        console.log("npm run dev:worker");

        // Helper to ping DB to watch status
        let isDone = false;
        console.log("\nWatching MongoDB for live updates...");
        while (!isDone) {
            await new Promise(r => setTimeout(r, 1000));
            const state = await ScanModel.getById(scanId.toString());
            if (state) {
                console.log(`[STATE] ${state.status.padEnd(10)} | Progress: ${state.progress}% | ${state.message}`);
                if (state.status === "completed" || state.status === "failed") {
                    isDone = true;
                    if (state.status === "completed" && state.engine_result) {
                        const res = state.engine_result as any;
                        console.log("\nExtracted Routes:");
                        console.log(res.architecture.routes.slice(0, 3));
                        console.log("...");
                    }
                }
            }
        }
    } catch (err) {
        console.error("Test failed", err);
    }

    process.exit(0);
}

testPushJob();
