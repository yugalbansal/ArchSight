"use client";

import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const SYNC_KEY = "archsight_user_synced";

/**
 * Hook that syncs the current Clerk user to Supabase via the Express backend.
 * Runs once per browser session when the user is authenticated.
 * Uses sessionStorage so re-mounts (navigation) don't re-trigger the sync.
 */
export function useUserSync() {
    const { getToken, isSignedIn } = useAuth();
    const { user } = useUser();
    const isSyncing = useRef(false);

    useEffect(() => {
        if (!isSignedIn || !user) return;

        // Already synced this session or a sync is in-flight
        if (sessionStorage.getItem(SYNC_KEY) || isSyncing.current) return;

        isSyncing.current = true;

        async function syncUser() {
            try {
                const token = await getToken();
                console.log("🔄 Syncing user to backend...", user?.primaryEmailAddress?.emailAddress);

                const res = await fetch(`${API_URL}/api/user`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                });

                if (res.ok) {
                    const data = await res.json();
                    console.log("✅ User synced:", data.user?.email);
                    // Persist so re-mounts within the same tab don't re-sync
                    sessionStorage.setItem(SYNC_KEY, "1");
                } else {
                    const err = await res.json().catch(() => ({}));
                    console.error("❌ User sync failed:", res.status, err);
                }
            } catch (err) {
                console.error("❌ User sync error:", err);
            } finally {
                isSyncing.current = false;
            }
        }

        syncUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSignedIn, user?.id]);
}
