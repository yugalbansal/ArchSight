import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";
import { Providers } from "@/lib/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "ArchSight — Code Architecture Intelligence",
    description:
        "Connect your repo and automatically generate live architecture diagrams, AI insights, and LLM cost analysis.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body className={inter.className}>
                <SessionProvider>
                    <Providers>{children}</Providers>
                </SessionProvider>
            </body>
        </html>
    );
}
