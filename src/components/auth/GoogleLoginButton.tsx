"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { auth, signOut } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";

// Google "G" icon as inline SVG
function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

interface GoogleLoginButtonProps {
  redirectTo?: string;
  label?: string;
  /** When true (sign-up page), signs out immediately after getting email, then shows form */
  isSignUp?: boolean;
}

export function GoogleLoginButton({
  redirectTo = "/",
  label = "Continue with Google",
  isSignUp = false,
}: GoogleLoginButtonProps) {
  const router = useRouter();
  const { signInWithGoogle, loading } = useAuth();
  const [googleSuccess, setGoogleSuccess] = useState<{ email: string } | null>(null);

  const handleClick = async () => {
    try {
      const user = await signInWithGoogle();
      if (isSignUp && user) {
        const email = user.email ?? "";

        // ── KEY FIX: immediately sign out so no active Firebase session exists.
        // The user must complete the full registration form (name + password + phone OTP).
        await signOut(auth);

        // Show success screen for 2 seconds, then redirect to form with email pre-filled
        setGoogleSuccess({ email });
        setTimeout(() => {
          const params = new URLSearchParams();
          if (email) params.set("google_email", email);
          router.push(`/sign-up?${params.toString()}`);
        }, 2000);
      } else {
        router.push(redirectTo);
      }
    } catch {
      // error handled in hook
    }
  };

  // Success screen shown briefly before redirecting to the registration form
  if (googleSuccess) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-5 text-center dark:border-green-900/50 dark:bg-green-950/30">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <p className="text-[14px] font-bold text-green-800 dark:text-green-300">
            Google account connected!
          </p>
          <p className="mt-0.5 text-[12px] text-green-700/80 dark:text-green-400/80">
            Signed in as <strong>{googleSuccess.email}</strong>
          </p>
        </div>
        <p className="text-[12px] text-green-600/70 dark:text-green-500/70">
          Redirecting to complete sign up…
        </p>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <GoogleIcon />
      )}
      {label}
    </Button>
  );
}

export default GoogleLoginButton;
