import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: "/auth/login",
    },
    providers: [], // Providers are added in auth.ts to avoid Node.js native modules in the Edge runtime
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const protectedPaths = ["/dashboard", "/repositories", "/insights"];
            const isProtected = protectedPaths.some((p) =>
                nextUrl.pathname.startsWith(p)
            );

            if (isProtected && !isLoggedIn) {
                return Response.redirect(new URL("/auth/login", nextUrl));
            }

            // Redirect logged-in users away from auth pages
            if (
                isLoggedIn &&
                nextUrl.pathname.startsWith("/auth/")
            ) {
                return Response.redirect(new URL("/dashboard", nextUrl));
            }

            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user && token.id) {
                session.user.id = token.id as string;
            }
            return session;
        },
    },
    session: { strategy: "jwt" },
    trustHost: true,
} satisfies NextAuthConfig;
