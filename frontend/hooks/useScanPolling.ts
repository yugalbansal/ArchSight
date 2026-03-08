import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth, API_URL } from "@/lib/api";

export type ScanStatus = "pending" | "cloning" | "detecting" | "parsing" | "extracting" | "analysing" | "completed" | "failed";

export interface ScanResult {
    _id: string;
    repo_owner: string;
    repo_name: string;
    branch: string;
    status: ScanStatus;
    progress: number;
    message: string;
    engine_result?: any;
    error_details?: string;
}

interface UseScanPollingResult {
    scan: ScanResult | null;
    error: string | null;
    isPolling: boolean;
    startPolling: (scanId: string) => void;
    stopPolling: () => void;
}

export function useScanPolling(initialIntervalMs = 2000): UseScanPollingResult {
    const [scanId, setScanId] = useState<string | null>(null);
    const [scan, setScan] = useState<ScanResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPolling, setIsPolling] = useState(false);

    const fetchScanStatus = useCallback(async (id: string) => {
        try {
            const response = await fetchWithAuth(`${API_URL}/api/scan/${id}`, {
                method: "GET",
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || "Failed to fetch scan status");
            }

            const data = await response.json();
            const currentScan: ScanResult = data.scan;

            setScan(currentScan);
            setError(null);

            // Stop polling if we reached a terminal state
            if (currentScan.status === "completed" || currentScan.status === "failed") {
                setIsPolling(false);
                setScanId(null);
            }
        } catch (err: any) {
            setError(err.message || "An unknown error occurred while polling");
            setIsPolling(false);
            setScanId(null);
        }
    }, []);

    // Polling Effect
    useEffect(() => {
        if (!isPolling || !scanId) return;

        // Fetch immediately
        fetchScanStatus(scanId);

        // Then set up interval
        const interval = setInterval(() => {
            fetchScanStatus(scanId);
        }, initialIntervalMs);

        return () => clearInterval(interval);
    }, [isPolling, scanId, fetchScanStatus, initialIntervalMs]);

    const startPolling = useCallback((id: string) => {
        setScanId(id);
        setIsPolling(true);
        setError(null);
    }, []);

    const stopPolling = useCallback(() => {
        setIsPolling(false);
        setScanId(null);
    }, []);

    return { scan, error, isPolling, startPolling, stopPolling };
}
