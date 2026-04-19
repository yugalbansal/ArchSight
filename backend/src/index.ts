import "./env.js"; // ← MUST be first: loads .env before any module reads process.env
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ExpressAuth, getSession } from "@auth/express";
import { authConfig } from "./lib/auth-config.js";
import { prisma } from "./lib/db.js";
import userRouter from "./routes/user.js";
import scanRouter from "./routes/scan.js";
import githubRouter from "./routes/github.js";
import architectureRouter from "./routes/architecture.routes.js";
import intelligenceRouter from "./routes/intelligence.js";
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { scanQueue } from "./queue/index.js";



const app = express();
const PORT = process.env.PORT || 3001;

// CORS — allow Next.js frontend
app.use(
    cors({
        origin: [
            "http://localhost:3000",
            process.env.FRONTEND_URL || ""
        ].filter(Boolean),
        credentials: true,
    })
);

// Cookie parser
app.use(cookieParser());

// Request logger
app.use((req, _res, next) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// Parse JSON
app.use(express.json());

// Auth.js handler — handles /auth/* routes (signin, signout, callback, etc.)
app.set("trust proxy", true);
app.use("/auth/*", ExpressAuth(authConfig));

// Routes
app.use("/api/user", userRouter);
app.use("/api/scan", scanRouter);
app.use("/api/github", githubRouter);
app.use("/api/architecture", architectureRouter);
app.use("/api/intelligence", intelligenceRouter);

// Set up Bull-Board UI for graphical queue monitoring
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
    queues: [new BullMQAdapter(scanQueue)],
    serverAdapter: serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

// Health check
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// DB health check — useful for diagnosing production connection issues
app.get("/api/health/db", async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: "ok", db: "connected" });
    } catch (err: any) {
        res.status(503).json({ status: "error", db: "unreachable", message: err.message });
    }
});

/** Mask password in a postgres connection string for safe logging */
function maskDbUrl(url: string | undefined): string {
    if (!url) return "❌ not set";
    try {
        const u = new URL(url);
        const host = u.host;
        const port = u.port || "5432";
        const hasPgBouncer = url.includes("pgbouncer=true");
        const hasSSL = url.includes("sslmode=");
        const mode = port === "6543"
            ? "⚠️  transaction pooler (port 6543) — use session pooler (port 5432) for persistent servers"
            : port === "5432" ? "✅ session/direct (port 5432)" : `port ${port}`;
        return `✅ ${host}  mode=${mode}  pgbouncer=${hasPgBouncer ? "✅" : "—"}  ssl=${hasSSL ? "✅" : "⚠️"}`;
    } catch {
        return "⚠️  URL parse failed — check format";
    }
}

app.listen(PORT, async () => {
    console.log(`\n🚀 ArchSight server running on http://localhost:${PORT}`);
    console.log(`   REDIS_URL:    ${process.env.REDIS_URL ? "✅ set" : "❌ missing"}`);
    console.log(`   AUTH_SECRET:  ${process.env.AUTH_SECRET ? "✅ set" : "❌ missing"}`);
    console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || "⚠️  not set (CORS may block prod)"}`);
    console.log(`   DATABASE_URL: ${maskDbUrl(process.env.DATABASE_URL)}`);
    console.log(`   DIRECT_URL:   ${maskDbUrl(process.env.DIRECT_URL)}`);
    console.log(`   AUTH_GOOGLE_ID:  ${process.env.AUTH_GOOGLE_ID ? "✅ set" : "⏭️  skipped"}`);
    console.log(`   AUTH_GITHUB_ID:  ${process.env.AUTH_GITHUB_ID ? "✅ set" : "⏭️  skipped"}`);

    // Test actual DB connectivity at startup so misconfiguration is immediately visible in Render logs
    console.log("\n   Testing database connection...");
    try {
        await prisma.$connect();
        await prisma.$queryRaw`SELECT 1`;
        console.log("   DB connection: ✅ OK\n");
    } catch (err: any) {
        console.error("   DB connection: ❌ FAILED");
        console.error("   →", err.message);
        console.error("   ⚠️  Most likely cause: DATABASE_URL is using port 6543 (transaction pooler).");
        console.error("   ⚠️  Render (persistent server) requires port 5432 (session pooler).");
        console.error("   ⚠️  Fix on Render: set DATABASE_URL to the Supabase 'Session mode' connection string:");
        console.error("   ⚠️  postgresql://postgres.PROJECTREF:PASSWORD@aws-X-REGION.pooler.supabase.com:5432/postgres?sslmode=require");
        console.error("   ⚠️  Get it from: Supabase → Project Settings → Database → Connection string → Session mode\n");
    }
});
