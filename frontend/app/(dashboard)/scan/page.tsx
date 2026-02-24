"use client";

import { useState } from "react";
import { useScanPolling } from "@/hooks/useScanPolling";

export default function ScanTestingPage() {
    const [repoInput, setRepoInput] = useState("gothinkster/node-express-realworld-example-app");
    const [branchInput, setBranchInput] = useState("master");

    // Custom Hook handles the API interval polling
    const { scan, error, isPolling, startPolling } = useScanPolling(1500); // poll every 1.5s
    const [isTriggering, setIsTriggering] = useState(false);

    const handleStartScan = async () => {
        if (!repoInput) return;
        setIsTriggering(true);

        const [owner, repo] = repoInput.split("/");

        try {
            const reqUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/scan`;
            const response = await fetch(reqUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ owner, repo, branch: branchInput }),
                credentials: "include"
            });

            const data = await response.json();

            if (!response.ok) {
                alert("Error scheduling scan: " + (data.error || "Unknown"));
                return;
            }

            // Immediately start polling the returned scan ID
            startPolling(data.scan_id);

        } catch (err) {
            alert("Failed to connect to backend");
        } finally {
            setIsTriggering(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold">Repository Scanner (Phase 5 Demo)</h1>
            <p className="text-gray-400">
                This triggers an asynchronous background job encoded via Redis/BullMQ.
                The heavy code-vision engines run completely off-thread!
            </p>

            {/* Input Form */}
            <div className="flex flex-col gap-4 bg-gray-900 border border-gray-800 p-6 rounded-lg">
                <div>
                    <label className="block text-sm mb-1 text-gray-400">GitHub Repository (owner/repo)</label>
                    <input
                        type="text"
                        value={repoInput}
                        onChange={(e) => setRepoInput(e.target.value)}
                        className="w-full bg-gray-950 border border-gray-800 px-4 py-2 rounded focus:outline-none focus:border-blue-500"
                        disabled={isPolling || isTriggering}
                    />
                </div>
                <div>
                    <label className="block text-sm mb-1 text-gray-400">Branch</label>
                    <input
                        type="text"
                        value={branchInput}
                        onChange={(e) => setBranchInput(e.target.value)}
                        className="w-full bg-gray-950 border border-gray-800 px-4 py-2 rounded focus:outline-none focus:border-blue-500"
                        disabled={isPolling || isTriggering}
                    />
                </div>

                <button
                    onClick={handleStartScan}
                    disabled={isPolling || isTriggering}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-6 rounded transition disabled:opacity-50 mt-2"
                >
                    {isTriggering ? "Queueing..." : isPolling ? "Scan in Progress..." : "Start Background Scan"}
                </button>
            </div>

            {/* Live Polling Results */}
            {error && (
                <div className="bg-red-950/50 border border-red-900 text-red-200 p-4 rounded-lg">
                    <p className="font-bold mb-1">Polling Error</p>
                    <p className="font-mono text-sm">{error}</p>
                </div>
            )}

            {scan && (
                <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">Scan Status: <span className="text-blue-400 uppercase">{scan.status}</span></h2>
                        <div className="text-sm text-gray-400 font-mono">{scan.progress}%</div>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden relative">
                        {/* Dynamic Progress Indicator */}
                        <div className="bg-blue-600 h-4 transition-all duration-500 ease-out" style={{ width: `${scan.progress}%` }}></div>
                    </div>

                    <p className="text-gray-300 font-mono text-sm bg-black/50 p-3 rounded">
                        &gt; {scan.message}
                    </p>

                    {scan.status === "completed" && scan.engine_result && (
                        <div className="mt-8">
                            <h3 className="text-lg font-bold text-green-400 mb-2">Scan Finished! 🚀</h3>
                            <div className="bg-gray-950 border border-gray-800 p-4 rounded overflow-auto max-h-96 text-xs font-mono">
                                <pre>{JSON.stringify(scan.engine_result, null, 2)}</pre>
                            </div>
                        </div>
                    )}

                    {scan.status === "failed" && scan.error_details && (
                        <div className="mt-8">
                            <h3 className="text-lg font-bold text-red-400 mb-2">Scan Failed ❌</h3>
                            <div className="bg-red-950/50 border border-red-900 p-4 rounded text-xs font-mono text-red-200 break-all">
                                {scan.error_details}
                            </div>
                        </div>
                    )}
                </div>
            )
            }
        </div >
    );
}
