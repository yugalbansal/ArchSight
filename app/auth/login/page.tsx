import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Github, GitlabIcon } from "lucide-react";
import Link from "next/link";

export default function Login() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 relative">
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[20%] left-[30%] w-[400px] h-[400px] rounded-full bg-primary/8 blur-[100px]" />
                <div className="absolute bottom-[20%] right-[30%] w-[300px] h-[300px] rounded-full bg-accent/5 blur-[100px]" />
            </div>

            <div className="glass w-full max-w-md p-8 relative z-10">
                <div className="flex items-center justify-center gap-2 mb-8">
                    <Zap className="h-6 w-6 text-primary" />
                    <span className="text-xl font-bold text-foreground">ArchSight</span>
                </div>
                <h1 className="text-2xl font-bold text-foreground text-center mb-1">Welcome back</h1>
                <p className="text-sm text-muted-foreground text-center mb-8">Sign in to your ArchSight account</p>

                <div className="space-y-3 mb-6">
                    <Button variant="ghost" className="w-full border border-white/10 text-foreground gap-2 h-11">
                        <Github className="h-5 w-5" /> Continue with GitHub
                    </Button>
                    <Button variant="ghost" className="w-full border border-white/10 text-foreground gap-2 h-11">
                        <GitlabIcon className="h-5 w-5" /> Continue with GitLab
                    </Button>
                </div>

                <div className="flex items-center gap-3 mb-6">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-xs text-muted-foreground">or</span>
                    <div className="flex-1 h-px bg-white/10" />
                </div>

                <div className="space-y-4">
                    <div>
                        <Label className="text-sm text-muted-foreground mb-1.5 block">Email</Label>
                        <Input type="email" placeholder="alex@company.com" className="bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground/50 h-11" />
                    </div>
                    <div>
                        <Label className="text-sm text-muted-foreground mb-1.5 block">Password</Label>
                        <Input type="password" placeholder="••••••••" className="bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground/50 h-11" />
                    </div>
                    <Button className="w-full gradient-primary text-primary-foreground border-0 h-11">Sign in</Button>
                </div>

                <p className="text-sm text-muted-foreground text-center mt-6">
                    Don&apos;t have an account?{" "}
                    <Link href="/auth/signup" className="text-primary hover:underline">Sign up</Link>
                </p>
            </div>
        </div>
    );
}
