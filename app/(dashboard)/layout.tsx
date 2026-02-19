// Force all dashboard pages to render dynamically (no static prerender)
// Required because Clerk UserButton and middleware require runtime context
export const dynamic = "force-dynamic";

import DashboardShell from "@/components/DashboardShell";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <DashboardShell>{children}</DashboardShell>;
}
