"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Github, Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function Signup() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [oauthLoading, setOauthLoading] = useState<string | null>(null);
    const router = useRouter();
    const { toast } = useToast();

    // Email / password sign-up
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Register the user via API
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast({
                    title: "Error",
                    description: data.error || "Sign up failed. Please try again.",
                    variant: "destructive",
                });
                return;
            }

            // 2. Auto-login with credentials
            const signInResult = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (signInResult?.error) {
                toast({
                    title: "Account created",
                    description: "Your account was created. Please sign in.",
                });
                router.push("/auth/login");
            } else {
                router.push("/dashboard");
                router.refresh();
            }
        } catch {
            toast({
                title: "Error",
                description: "Sign up failed. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    // OAuth sign-up (Google / GitHub)
    const handleOAuth = async (provider: "google" | "github") => {
        setOauthLoading(provider);
        try {
            await signIn(provider, { callbackUrl: "/dashboard" });
        } catch {
            toast({
                title: "Error",
                description: `${provider} sign up failed.`,
                variant: "destructive",
            });
            setOauthLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 relative">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[20%] right-[20%] w-[400px] h-[400px] rounded-full bg-secondary/8 blur-[100px]" />
                <div className="absolute bottom-[30%] left-[20%] w-[300px] h-[300px] rounded-full bg-primary/5 blur-[100px]" />
            </div>

            <div className="glass w-full max-w-md p-8 relative z-10">
                <div className="flex items-center justify-center gap-2 mb-8">
                    <Zap className="h-6 w-6 text-primary" />
                    <span className="text-xl font-bold text-foreground">ArchSight</span>
                </div>
                <h1 className="text-2xl font-bold text-foreground text-center mb-1">
                    Create your account
                </h1>
                <p className="text-sm text-muted-foreground text-center mb-8">
                    Start analyzing your architecture for free
                </p>

                {/* OAuth Buttons */}
                <div className="space-y-3 mb-6">
                    <Button
                        variant="ghost"
                        className="w-full border border-white/10 text-foreground gap-2 h-11"
                        onClick={() => handleOAuth("google")}
                        disabled={!!oauthLoading}
                    >
                        {oauthLoading === "google" ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                        )}
                        Continue with Google
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full border border-white/10 text-foreground gap-2 h-11"
                        onClick={() => handleOAuth("github")}
                        disabled={!!oauthLoading}
                    >
                        {oauthLoading === "github" ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Github className="h-5 w-5" />
                        )}
                        Continue with GitHub
                    </Button>
                </div>

                <div className="flex items-center gap-3 mb-6">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-xs text-muted-foreground">or</span>
                    <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Email / Password Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label className="text-sm text-muted-foreground mb-1.5 block">
                            Full name
                        </Label>
                        <Input
                            placeholder="Alex Johnson"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground/50 h-11"
                        />
                    </div>
                    <div>
                        <Label className="text-sm text-muted-foreground mb-1.5 block">
                            Email
                        </Label>
                        <Input
                            type="email"
                            placeholder="alex@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground/50 h-11"
                            required
                        />
                    </div>
                    <div>
                        <Label className="text-sm text-muted-foreground mb-1.5 block">
                            Password
                        </Label>
                        <Input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground/50 h-11"
                            required
                            minLength={6}
                        />
                    </div>
                    <Button
                        type="submit"
                        className="w-full gradient-primary text-primary-foreground border-0 h-11"
                        disabled={loading}
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            "Start for free"
                        )}
                    </Button>
                </form>

                <p className="text-xs text-muted-foreground text-center mt-6">
                    By signing up, you agree to our Terms of Service and Privacy Policy.
                </p>
                <p className="text-sm text-muted-foreground text-center mt-3">
                    Already have an account?{" "}
                    <Link href="/auth/login" className="text-primary hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
