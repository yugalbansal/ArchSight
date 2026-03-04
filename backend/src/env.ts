import dotenv from "dotenv";

// MUST be the very first import in index.ts and scan.worker.ts
// In ESM, all imports are hoisted — so dotenv.config() inside index.ts
// runs AFTER all imported modules are initialized.
// By isolating it here, importing this module first guarantees env vars
// are set before any other module (queue, db, auth) reads process.env.
dotenv.config();
