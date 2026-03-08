"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { fetchWithAuth, API_URL } from "@/lib/api";

function GitHubAppCallbackContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { data: session } = useSession();

    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const installApp = async () => {
            const installationId = searchParams.get("installation_id");

            if (!installationId) {
                setStatus("error");
                setErrorMessage("No installation_id found in the URL.");
                return;
            }

            if (!session?.user) {
                // Wait for session to load if it's lagging
                return;
            }

            try {
                const res = await fetchWithAuth(`${API_URL}/api/github/installation`, {
                    method: "POST",
                    body: JSON.stringify({ installation_id: installationId }),
                });

                if (res.ok) {
                    setStatus("success");
                    setTimeout(() => {
                        router.push("/repositories");
                    }, 2000);
                } else {
                    const data = await res.json();
                    setStatus("error");
                    setErrorMessage(data.error || "Failed to link installation to your account.");
                }
            } catch {
                setStatus("error");
                setErrorMessage("Network error occurred while linking GitHub App.");
            }
        };

        installApp();
    }, [searchParams, router, session]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            {status === "loading" && (
                <>
                    <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-6" />
                    <h1 className="text-2xl font-bold text-foreground mb-2">Connecting to GitHub...</h1>
                    <p className="text-muted-foreground max-w-sm">
                        Please wait while we securely link your repositories and generate authorization tokens.
                    </p>
                </>
            )}

            {status === "success" && (
                <>
                    <div className="h-16 w-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Connection Successful!</h1>
                    <p className="text-muted-foreground max-w-sm">
                        Your GitHub repositories are now linked. Redirecting you to your dashboard...
                    </p>
                </>
            )}

            {status === "error" && (
                <>
                    <div className="h-16 w-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                        <XCircle className="h-8 w-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Authentication Failed</h1>
                    <p className="text-muted-foreground max-w-sm">
                        {errorMessage}
                    </p>
                    <button
                        onClick={() => router.push("/repositories")}
                        className="mt-6 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-md text-sm transition-colors"
                    >
                        Return to Repositories
                    </button>
                </>
            )}
        </div>
    );
}

export default function GitHubAppCallback() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-6" />
                <h1 className="text-2xl font-bold text-foreground mb-2">Loading...</h1>
            </div>
        }>
            <GitHubAppCallbackContent />
        </Suspense>
    );
}
