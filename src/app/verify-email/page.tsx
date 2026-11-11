"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { applyActionCode } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, AlertCircle, Loader2 } from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "invalid">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const code = searchParams.get("oobCode");
        const continueUrl = searchParams.get("continueUrl") || "/";

        if (!code) {
          setStatus("invalid");
          setMessage("Invalid verification link. Please try signing up again.");
          return;
        }

        await applyActionCode(auth, code);

        setStatus("success");
        setMessage("Email verified successfully!");
        toast.success("Email verified! Redirecting...");

        setTimeout(() => {
          router.push(continueUrl);
        }, 1200);
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("error");
        setMessage(
          "Verification failed. The link may have expired. Please sign up again."
        );
        toast.error("Verification failed");
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-background dark:to-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-8 shadow-xl">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h1 className="text-2xl font-bold">Verifying Email</h1>
            <p className="text-center text-muted-foreground">
              Please wait while we verify your email address...
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold">Email Verified!</h1>
            <p className="text-center text-muted-foreground">{message}</p>
            <p className="text-center text-sm text-muted-foreground">
              Redirecting in 3 seconds...
            </p>
            <Button onClick={() => router.back()} className="mt-4 w-full">
              Go Back
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold">Verification Failed</h1>
            <p className="text-center text-muted-foreground">{message}</p>
            <div className="flex w-full gap-3">
              <Button variant="outline" onClick={() => router.push("/")} className="flex-1">
                Home
              </Button>
              <Button onClick={() => router.push("/sign-up")} className="flex-1">
                Sign Up Again
              </Button>
            </div>
          </div>
        )}

        {status === "invalid" && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
            <h1 className="text-2xl font-bold">Invalid Link</h1>
            <p className="text-center text-muted-foreground">{message}</p>
            <Button onClick={() => router.push("/sign-up")} className="mt-4 w-full">
              Sign Up
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
