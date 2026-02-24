import { Queue, QueueEvents } from "bullmq";
import { Redis } from "ioredis";

// Central Redis Connection 
// Max retries per request required by BullMQ to prevent memory leaks/hangs
export const redisConnection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
});

// The name of the queue we'll use for processing repositories
export const SCAN_QUEUE_NAME = "repo-scan-queue";

// The Queue instance configured to accept ScanJobs
export const scanQueue = new Queue(SCAN_QUEUE_NAME, {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});

// Listen to queue events globally to log them 
export const scanQueueEvents = new QueueEvents(SCAN_QUEUE_NAME, {
    connection: redisConnection,
});

scanQueueEvents.on("failed", ({ jobId, failedReason }) => {
    console.error(`[Queue] Job ${jobId} failed: ${failedReason}`);
});

scanQueueEvents.on("completed", ({ jobId }) => {
    console.log(`[Queue] Job ${jobId} successfully completed.`);
});
