"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, sendEmailVerification } from "firebase/auth";
import { Navbar } from "@/components/layout/Navbar";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function VerifyEmailPendingPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/sign-in"); return; }
      setEmail(user.email || "");

      const checkInterval = setInterval(async () => {
        await user.reload();
        if (user.emailVerified) {
          clearInterval(checkInterval);
          setVerified(true);
          toast.success("Email verified!");
          setTimeout(() => router.push("/onboarding"), 1000);
        }
      }, 3000);

      return () => clearInterval(checkInterval);
    });
    return () => unsubscribe();
  }, [router]);

  const handleResend = async () => {
    if (!auth.currentUser) return;
    setResending(true);
    try {
      await sendEmailVerification(auth.currentUser, {
        url: `${window.location.origin}/verify-email?continueUrl=/onboarding`,
        handleCodeInApp: true,
      });
      toast.success("Verification email sent!");
    } catch {
      toast.error("Failed to send email. Try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex min-h-[calc(100vh-56px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">

          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all duration-500 ${
              verified
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-900/20"
                : "border-border/60 bg-muted/30"
            }`}>
              {verified
                ? <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                : <Mail className="h-7 w-7 text-muted-foreground/60" />
              }
            </div>
          </div>

          {/* Text */}
          <div className="mb-6 text-center">
            <h1 className="text-[22px] font-semibold tracking-tight mb-2">
              {verified ? "Email verified!" : "Check your email"}
            </h1>
            <p className="text-[14px] text-muted-foreground leading-relaxed">
              {verified
                ? "Redirecting you to set up your account…"
                : <>We sent a verification link to <span className="font-medium text-foreground">{email}</span></>
              }
            </p>
          </div>

          {!verified && (
            <>
              {/* Status */}
              <div className="mb-6 flex items-center gap-2.5 rounded-[10px] border border-border/60 bg-muted/20 px-4 py-3">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground/60" />
                <p className="text-[13px] text-muted-foreground">
                  Waiting for verification — you&apos;ll be redirected automatically.
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-2.5">
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="w-full rounded-[10px] border border-border/60 bg-white dark:bg-card py-2.5 text-[13px] font-semibold text-foreground hover:bg-muted/40 disabled:opacity-50 transition-colors"
                >
                  {resending ? "Sending…" : "Resend verification email"}
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="w-full py-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back to Home
                </button>
              </div>

              <p className="mt-5 text-center text-[11px] text-muted-foreground/60">
                Check your spam folder if you don&apos;t see the email.
              </p>
            </>
          )}

        </div>
      </main>
    </>
  );
}
