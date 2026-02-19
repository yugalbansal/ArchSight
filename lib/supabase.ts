import { createClient } from "@supabase/supabase-js";
import { useSession } from "@clerk/nextjs";

/**
 * Creates a Supabase client authenticated with the current Clerk session.
 * Uses Clerk as a third-party auth provider in Supabase, so RLS policies
 * using `auth.jwt()->>'sub'` automatically scope data to the current user.
 *
 * Usage in a "use client" component:
 *   const client = useClerkSupabase();
 *   const { data } = await client.from("users").select("*");
 */
export function useClerkSupabase() {
    const { session } = useSession();

    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            async accessToken() {
                return session?.getToken() ?? null;
            },
        }
    );
}
