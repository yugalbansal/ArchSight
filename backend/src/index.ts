import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { ExpressAuth, getSession } from "@auth/express";
import { authConfig } from "./lib/auth-config.js";
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

// Health check
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`\n🚀 ArchSight server running on http://localhost:${PORT}`);
    console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? "✅ set" : "❌ missing"}`);
    console.log(`   AUTH_SECRET: ${process.env.AUTH_SECRET ? "✅ set" : "❌ missing"}`);
    console.log(`   AUTH_GOOGLE_ID: ${process.env.AUTH_GOOGLE_ID ? "✅ set" : "⏭️  skipped"}`);
    console.log(`   AUTH_GITHUB_ID: ${process.env.AUTH_GITHUB_ID ? "✅ set" : "⏭️  skipped"}`);
    console.log("");
});
