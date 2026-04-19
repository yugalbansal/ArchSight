"use client";

import { SignInPage } from "@/components/ui/sign-in-flow-1";

export default function Signup() {
    return (
        <div className="min-h-screen bg-black">
            <SignInPage isSignUp={true} />
        </div>
    );
}
