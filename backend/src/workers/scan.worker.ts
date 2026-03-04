import "../env.js"; // ← MUST be first: loads .env before any module reads process.env
import { Worker } from "bullmq";
import { redisConnection, SCAN_QUEUE_NAME } from "../queue/index.js";

// Ensure MongoDB and GitHub App connect early in the worker boot process
import "../lib/db.js";
import processor from "./scan.processor.js"; // tsx resolves .js -> .ts at runtime

console.log("[Worker] Booting up BullMQ Repo-Scanner Worker...");
console.log(`[Worker] Queue: ${SCAN_QUEUE_NAME}`);

// Pass the processor function directly — no compiled .js file needed.
// This works perfectly with `tsx watch` in development.
// Note: web-tree-sitter init happens inside scan.processor.ts via ensureParserReady()
// which is called once per sandboxed process (thread-safe by design).
const scanWorker = new Worker(
    SCAN_QUEUE_NAME,
    processor,
    {
        connection: redisConnection,
        concurrency: 2,
        limiter: {
            max: 10,
            duration: 1000,
        },
    }
);

console.log("[Worker] Ready and listening for jobs...");

// Graceful Shutdown
process.on('SIGTERM', async () => {
    console.log('[Worker] Shutting down gracefully...');
    await scanWorker.close();
    process.exit(0);
});

scanWorker.on('active', (job) => {
    console.log(`[Worker] Processing job ${job.id}...`);
});

scanWorker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed successfully.`);
});

scanWorker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed: ${err.message}`);
});

// Heartbeat — keeps process alive on free-tier hosts (Render, etc.)
setInterval(() => {
    console.log(`[Worker] Heartbeat — alive | ${new Date().toISOString()}`);
}, 300_000); // 5 minutes
