import "./env.js"; // ← MUST be first: loads .env before any module reads process.env
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ExpressAuth, getSession } from "@auth/express";
import { authConfig } from "./lib/auth-config.js";
import userRouter from "./routes/user.js";
import scanRouter from "./routes/scan.js";
import githubRouter from "./routes/github.js";
import architectureRouter from "./routes/architecture.routes.js";
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

app.listen(PORT, () => {
    console.log(`\n🚀 ArchSight server running on http://localhost:${PORT}`);
    console.log(`   REDIS_URL: ${process.env.REDIS_URL ? "✅ set" : "❌ missing"}`);
    console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? "✅ set" : "❌ missing"}`);
    console.log(`   AUTH_SECRET: ${process.env.AUTH_SECRET ? "✅ set" : "❌ missing"}`);
    console.log(`   AUTH_GOOGLE_ID: ${process.env.AUTH_GOOGLE_ID ? "✅ set" : "⏭️  skipped"}`);
    console.log(`   AUTH_GITHUB_ID: ${process.env.AUTH_GITHUB_ID ? "✅ set" : "⏭️  skipped"}`);
    console.log("");
});
