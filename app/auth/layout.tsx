// Force all auth pages to render dynamically (no static prerender)
// Required because Clerk hooks need runtime context
export const dynamic = "force-dynamic";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
