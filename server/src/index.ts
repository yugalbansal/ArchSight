import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { clerkMiddleware } from "@clerk/express";
import webhookRouter from "./routes/webhook.js";
import userRouter from "./routes/user.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS — allow Next.js frontend
app.use(
    cors({
        origin: ["http://localhost:3000"],
        credentials: true,
    })
);

// Request logger — shows every incoming request in terminal
app.use((req, _res, next) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// Parse JSON for all routes except webhooks (which need raw body)
app.use("/api/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

// Clerk middleware — makes auth available on all routes
app.use(clerkMiddleware());

// Routes
app.use("/api/webhook/clerk", webhookRouter);
app.use("/api/user", userRouter);

// Health check
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`\n🚀 ArchSight server running on http://localhost:${PORT}`);
    console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL ? "✅ set" : "❌ missing"}`);
    console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ set" : "❌ missing"}`);
    console.log(`   CLERK_PUBLISHABLE_KEY: ${process.env.CLERK_PUBLISHABLE_KEY ? "✅ set" : "❌ missing"}`);
    console.log(`   CLERK_SECRET_KEY: ${process.env.CLERK_SECRET_KEY ? "✅ set" : "❌ missing"}`);
    console.log(`   CLERK_WEBHOOK_SECRET: ${process.env.CLERK_WEBHOOK_SECRET ? "✅ set" : "⏭️  skipped (using fallback sync)"}`);
    console.log("");
});

