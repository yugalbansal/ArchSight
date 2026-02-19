import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
            <h1 className="text-8xl font-bold gradient-text">404</h1>
            <p className="text-xl text-muted-foreground">This page does not exist.</p>
            <Link
                href="/"
                className="text-primary hover:underline transition-colors"
            >
                Return to Home
            </Link>
        </div>
    );
}
