import { App } from "octokit";
import dotenv from "dotenv";

dotenv.config();

const { GITHUB_APP_ID, GITHUB_PRIVATE_KEY, GITHUB_WEBHOOK_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = process.env;

if (!GITHUB_APP_ID || !GITHUB_PRIVATE_KEY || !GITHUB_WEBHOOK_SECRET || !GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    console.warn("[GitHub App] Missing critical environment variables for GitHub App integration!");
}

// Ensure the private key is formatted correctly (convert literal \n to actual newlines)
let privateKey = GITHUB_PRIVATE_KEY || "";
privateKey = privateKey.replace(/^["']|["']$/g, "");

// Bulletproof PEM Reconstruction Strategy:
// No matter how badly the .env file stripped or corrupted the newlines in the key string,
// we extract the pristine base64 entropy, strip all impurities, and perfectly reconstruct
// the RFC-compliant 64-character line lengths between the strict headers.
const beginHeader = "-----BEGIN RSA PRIVATE KEY-----";
const endHeader = "-----END RSA PRIVATE KEY-----";

if (privateKey.includes(beginHeader) && privateKey.includes(endHeader)) {
    // Rips out the raw base64 payload
    let base64Content = privateKey.substring(
        privateKey.indexOf(beginHeader) + beginHeader.length,
        privateKey.indexOf(endHeader)
    );
    // Erase any spaces, implicit newlines, explicit \n, etc.
    base64Content = base64Content.replace(/\s+/g, "").replace(/\\n/g, "");

    // Chunk into 64-character RFC-compliant lines
    const chunks = base64Content.match(/.{1,64}/g) || [];
    privateKey = `${beginHeader}\n${chunks.join('\n')}\n${endHeader}`;
} else {
    // Case B: No PEM headers found — user only pasted the raw base64 payload.
    // Strip ALL whitespace (real newlines, spaces, escaped \n) then re-wrap with headers.
    const rawBase64 = privateKey.replace(/\s+/g, "").replace(/\\n/g, "");
    if (rawBase64.length > 0) {
        const chunks = rawBase64.match(/.{1,64}/g) || [];
        privateKey = `${beginHeader}\n${chunks.join("\n")}\n${endHeader}`;
    }
}

privateKey = privateKey.trim();

export const githubApp = new App({
    appId: GITHUB_APP_ID!,
    privateKey: privateKey,
    oauth: {
        clientId: GITHUB_CLIENT_ID!,
        clientSecret: GITHUB_CLIENT_SECRET!,
    },
    webhooks: {
        secret: GITHUB_WEBHOOK_SECRET!,
    },
});

/**
 * Helper to get an authenticated Octokit instance scoped to a specific installation.
 * This is used to make API calls to repositories the user authorized.
 */
export async function getInstallationOctokit(installationId: number) {
    return await githubApp.getInstallationOctokit(installationId);
}
