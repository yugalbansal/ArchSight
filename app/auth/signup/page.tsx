"use client";

import { useState } from "react";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Github, Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import type { OAuthStrategy } from "@clerk/types";

export default function Signup() {
    const { isLoaded, signUp, setActive } = useSignUp();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [oauthLoading, setOauthLoading] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [code, setCode] = useState("");
    const router = useRouter();
    const { toast } = useToast();

    // Email / password sign-up
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded || !signUp) return;
        setLoading(true);

        try {
            const [firstName, ...lastParts] = name.split(" ");
            const lastName = lastParts.join(" ");

            const result = await signUp.create({
                emailAddress: email,
                password,
                firstName: firstName || undefined,
                lastName: lastName || undefined,
            });

            if (result.status === "complete") {
                // Email verification is disabled in Clerk — sign in directly
                await setActive({ session: result.createdSessionId });
                router.push("/dashboard");
                return;
            }

            // Email verification is required — send code
            await signUp.prepareEmailAddressVerification({
                strategy: "email_code",
            });

            setVerifying(true);
            toast({
                title: "Verification code sent",
                description: "Check your email for the code.",
            });
        } catch (err: unknown) {
            const clerkErr = err as { errors?: Array<{ longMessage?: string; message?: string }> };
            const message =
                clerkErr.errors?.[0]?.longMessage ||
                clerkErr.errors?.[0]?.message ||
                "Sign up failed. Please try again.";
            toast({ title: "Error", description: message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    // Verify email code
    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded || !signUp) return;
        setLoading(true);

        try {
            const result = await signUp.attemptEmailAddressVerification({ code });

            if (result.status === "complete") {
                await setActive({ session: result.createdSessionId });
                router.push("/dashboard");
            } else {
                console.error("Verification incomplete:", result.status);
                toast({
                    title: "Verification incomplete",
                    description: "Please try again.",
                    variant: "destructive",
                });
            }
        } catch (err: unknown) {
            const clerkErr = err as { errors?: Array<{ longMessage?: string; message?: string }> };
            const message =
                clerkErr.errors?.[0]?.longMessage ||
                clerkErr.errors?.[0]?.message ||
                "Verification failed.";
            toast({ title: "Error", description: message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    // OAuth sign-up (Google / GitHub)
    const handleOAuth = async (strategy: OAuthStrategy) => {
        if (!isLoaded || !signUp) return;
        setOauthLoading(strategy);

        try {
            await signUp.authenticateWithRedirect({
                strategy,
                redirectUrl: "/auth/sso-callback",
                redirectUrlComplete: "/dashboard",
            });
        } catch (err: unknown) {
            const clerkErr = err as { errors?: Array<{ message?: string }> };
            const message = clerkErr.errors?.[0]?.message || "OAuth sign up failed.";
            toast({ title: "Error", description: message, variant: "destructive" });
            setOauthLoading(null);
        }
    };

    // Verification code step
    if (verifying) {
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
                        Verify your email
                    </h1>
                    <p className="text-sm text-muted-foreground text-center mb-8">
                        We sent a verification code to <span className="text-foreground">{email}</span>
                    </p>

                    <form onSubmit={handleVerify} className="space-y-4">
                        <div>
                            <Label className="text-sm text-muted-foreground mb-1.5 block">
                                Verification code
                            </Label>
                            <Input
                                placeholder="Enter 6-digit code"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground/50 h-11 text-center text-lg tracking-widest"
                                required
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
                                "Verify & Continue"
                            )}
                        </Button>
                    </form>

                    <button
                        onClick={() => setVerifying(false)}
                        className="text-sm text-muted-foreground hover:text-foreground text-center mt-4 w-full transition-colors"
                    >
                        ← Back to sign up
                    </button>
                </div>
            </div>
        );
    }

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
                        onClick={() => handleOAuth("oauth_google")}
                        disabled={!isLoaded || !!oauthLoading}
                    >
                        {oauthLoading === "oauth_google" ? (
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
                        onClick={() => handleOAuth("oauth_github")}
                        disabled={!isLoaded || !!oauthLoading}
                    >
                        {oauthLoading === "oauth_github" ? (
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
                        />
                    </div>
                    {/* Clerk bot protection */}
                    <div id="clerk-captcha" />
                    <Button
                        type="submit"
                        className="w-full gradient-primary text-primary-foreground border-0 h-11"
                        disabled={!isLoaded || loading}
                    >
                        {(!isLoaded || loading) ? (
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
