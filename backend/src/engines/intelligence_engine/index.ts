/**
 * Intelligence Engine — Public API
 * ─────────────────────────────────
 * Engine 3: Intelligence & Analysis Engine
 *
 * Single import point for all consumers (scan processor, routes, etc.)
 *
 * Usage:
 *   import { analyzeArchitecture } from "../engines/intelligence_engine/index.js";
 *   const output = await analyzeArchitecture({ scan_id, repo_id, framework, frameworks, graph });
 */

export { analyzeArchitecture } from "./engine.js";
export * from "./schemas.js";
