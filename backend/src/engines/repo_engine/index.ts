/**
 * Pure Engine Module Export
 * Exposes core scanning, parsing, and extraction functionality
 * completely decoupled from business logic, database, or API layers.
 */

// Schemas
export * from "./schemas/architecture.schema.js";

// Scanner
export { cloneRepositoryEphemeral } from "./scanner/clone.js";
export type { CloneResult } from "./scanner/clone.js";

// Utils
export { walkDir } from "./utils/file.utils.js";

// Parser
export { detectFramework } from "./parser/detector.js";
export { parseFileAst } from "./parser/tree-sitter.js";

// Extractors
export { extractExpressRoutes } from "./extractors/express.extractor.js";
export { extractNextjsRoutes } from "./extractors/nextjs.extractor.js";
export { extractFastApiRoutes } from "./extractors/fastapi.extractor.js";
export { extractGenericStructure } from "./extractors/generic.extractor.js";
export type { FileStructure } from "./extractors/generic.extractor.js";
