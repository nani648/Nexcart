"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import {
  Eye, EyeOff, Loader2, AlertCircle, User, Mail,
  Lock, Phone, CheckCircle2, ShieldCheck,
} from "lucide-react";
import type { ConfirmationResult } from "firebase/auth";

function parseFirebaseError(msg: string): string {
  if (!msg) return "Something went wrong. Please try again.";
  const code = msg.match(/\(auth\/([^)]+)\)/)?.[1];
  const map: Record<string, string> = {
    "email-already-in-use": "An account with this email already exists.",
    "invalid-email": "Please enter a valid email address.",
    "weak-password": "Password must be at least 6 characters.",
    "network-request-failed": "Check your internet connection and try again.",
    "too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "operation-not-allowed": "This sign-up method is not enabled. Contact support.",
    "invalid-phone-number": "Enter a valid 10-digit Indian mobile number.",
    "invalid-verification-code": "The OTP you entered is incorrect.",
    "session-expired": "OTP expired. Please request a new one.",
  };
  if (code && map[code]) return map[code];
  return (
    msg
      .replace(/^Firebase:\s*/i, "")
      .replace(/\s*\(auth\/[^)]+\)\.?\s*/g, "")
      .replace(/\.\s*$/, "")
      .trim() || "Something went wrong. Please try again."
  );
}

type Step = "details" | "verify-phone" | "done";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUpWithEmail, sendPhoneOTP, verifyPhoneOTP, loading, error } = useAuth();

  // If user came back after Google sign-in, their email is pre-filled from URL param
  const googleEmail = searchParams.get("google_email") ?? "";
  const isGoogleLinked = !!googleEmail;

  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(googleEmail);
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  // Keep email in sync if URL param changes (e.g. user navigates back)
  useEffect(() => {
    if (googleEmail) setEmail(googleEmail);
  }, [googleEmail]);

  const errorMsg = localError ?? (error ? parseFirebaseError(error) : null);

  const box = (field: string) =>
    `flex items-center rounded-lg border bg-white dark:bg-card transition-colors ${
      focused === field ? "border-primary ring-2 ring-primary/10" : "border-input"
    }`;

  const validateDetails = (): boolean => {
    let ok = true;
    setNameError(""); setEmailError(""); setPasswordError(""); setPhoneError("");
    if (name.trim().length < 2) { setNameError("Please enter your full name (at least 2 characters)."); ok = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) { setEmailError("Please enter a valid email address."); ok = false; }
    if (password.length < 8) { setPasswordError("Password must be at least 8 characters."); ok = false; }
    if (phone.replace(/\D/g, "").length !== 10) { setPhoneError("Enter a valid 10-digit Indian mobile number."); ok = false; }
    return ok;
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateDetails()) return;
    setLocalError(null);
    try {
      await signUpWithEmail(email, password, name);
      const formatted = `+91${phone.replace(/\D/g, "")}`;
      confirmationRef.current = await sendPhoneOTP(formatted, "register-recaptcha");
      setStep("verify-phone");
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? parseFirebaseError(err.message) : "Sign-up failed.");
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    if (!confirmationRef.current) return;
    try {
      await verifyPhoneOTP(confirmationRef.current, otp, phone);
      setStep("done");
      setTimeout(() => router.push("/verify-email-pending"), 1200);
    } catch (err: unknown) {
      setOtpError(err instanceof Error ? parseFirebaseError(err.message) : "Invalid OTP. Try again.");
    }
  };

  if (step === "done") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/40">
          <CheckCircle2 className="h-7 w-7 text-green-600" />
        </div>
        <p className="text-[15px] font-semibold text-foreground">Both verifications complete!</p>
        <p className="text-[13px] text-muted-foreground">
          Mobile ✓&nbsp;&nbsp;·&nbsp;&nbsp;Verification email sent to <strong>{email}</strong>
        </p>
        <p className="text-[12px] text-muted-foreground">Redirecting…</p>
      </div>
    );
  }

  if (step === "verify-phone") {
    return (
      <div className="space-y-5">
        <div id="register-recaptcha" />
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900/50 dark:bg-blue-950/30">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <div>
            <p className="text-[13px] font-semibold text-blue-800 dark:text-blue-300">Verify your mobile number</p>
            <p className="text-[12px] text-blue-700/80 dark:text-blue-400/80">A 6-digit OTP was sent to <strong>+91 {phone}</strong></p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-900/50 dark:bg-green-950/30">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
          <div>
            <p className="text-[13px] font-semibold text-green-800 dark:text-green-300">Email verification link sent</p>
            <p className="text-[12px] text-green-700/80 dark:text-green-400/80">Check your inbox at <strong>{email}</strong></p>
          </div>
        </div>
        {(otpError || errorMsg) && (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 dark:border-red-900/50 dark:bg-red-950/30">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p className="text-[13px] text-red-700 dark:text-red-400">{otpError || errorMsg}</p>
          </div>
        )}
        <form onSubmit={handleOTPSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="otp" className="block text-[13px] font-medium text-foreground">Enter 6-digit OTP</label>
            <input
              id="otp" type="text" inputMode="numeric" placeholder="• • • • • •"
              maxLength={6} value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              autoFocus
              className="w-full rounded-lg border border-input bg-white px-4 py-3 text-center text-[22px] font-bold tracking-[0.6em] dark:bg-card focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <button type="submit" disabled={loading || otp.length < 6}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-[14px] font-semibold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Verifying…</> : "Verify & Create Account"}
          </button>
          <button type="button" onClick={() => setStep("details")}
            className="w-full text-center text-[12px] text-muted-foreground hover:text-foreground transition-colors">
            ← Change details
          </button>
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={handleDetailsSubmit} className="space-y-4">
      <div id="register-recaptcha" />
      {errorMsg && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 dark:border-red-900/50 dark:bg-red-950/30">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-[13px] leading-snug text-red-700 dark:text-red-400">{errorMsg}</p>
        </div>
      )}

      {/* Google linked badge */}
      {isGoogleLinked && (
        <div className="flex items-center gap-2.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 dark:border-green-900/50 dark:bg-green-950/30">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
          <p className="text-[12px] text-green-800 dark:text-green-300">
            Google account connected — your email is pre-filled. Set a password and verify your mobile to finish.
          </p>
        </div>
      )}

      {!isGoogleLinked && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-[12px] text-muted-foreground">
            Both <strong className="text-foreground">email</strong> and <strong className="text-foreground">mobile number</strong> will be verified and linked to your account.
          </p>
        </div>
      )}

      {/* Full Name */}
      <div className="space-y-1.5">
        <label htmlFor="name" className="block text-[13px] font-medium text-foreground">Full Name</label>
        <div className={box("name")}>
          <User className="ml-3 h-4 w-4 shrink-0 text-muted-foreground/60" />
          <input id="name" type="text" placeholder="Krishna Murthy" value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={() => setFocused("name")} onBlur={() => setFocused(null)}
            required autoComplete="name"
            className="w-full bg-transparent px-3 py-2.5 text-[14px] placeholder:text-muted-foreground/50 focus:outline-none" />
        </div>
        {nameError && <p className="text-[12px] text-red-500">{nameError}</p>}
      </div>

      {/* Email — locked if Google linked */}
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-[13px] font-medium text-foreground">
          Email
          {isGoogleLinked && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400">
              <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#34A853"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#34A853"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#34A853"/>
              </svg>
              Google
            </span>
          )}
        </label>
        <div className={`${box("email")} ${isGoogleLinked ? "opacity-80" : ""}`}>
          <Mail className="ml-3 h-4 w-4 shrink-0 text-muted-foreground/60" />
          <input id="email" type="email" placeholder="you@example.com" value={email}
            onChange={(e) => !isGoogleLinked && setEmail(e.target.value)}
            onFocus={() => !isGoogleLinked && setFocused("email")} onBlur={() => setFocused(null)}
            required autoComplete="email"
            readOnly={isGoogleLinked}
            className={`w-full bg-transparent px-3 py-2.5 text-[14px] placeholder:text-muted-foreground/50 focus:outline-none ${isGoogleLinked ? "cursor-default select-all" : ""}`}
          />
        </div>
        {isGoogleLinked && (
          <p className="text-[11px] text-muted-foreground">This email was used to sign in with Google and cannot be changed.</p>
        )}
        {emailError && <p className="text-[12px] text-red-500">{emailError}</p>}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-[13px] font-medium text-foreground">Password</label>
        <div className={box("password")}>
          <Lock className="ml-3 h-4 w-4 shrink-0 text-muted-foreground/60" />
          <input id="password" type={showPassword ? "text" : "password"} placeholder="Min. 8 characters"
            value={password} onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocused("password")} onBlur={() => setFocused(null)}
            required minLength={8} autoComplete="new-password"
            className="w-full bg-transparent px-3 py-2.5 text-[14px] placeholder:text-muted-foreground/50 focus:outline-none" />
          <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
            className="mr-3 flex h-7 w-7 items-center justify-center rounded text-muted-foreground/60 hover:text-foreground transition-colors">
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {password.length > 0 && password.length < 8 && (
          <p className="text-[12px] text-amber-600 dark:text-amber-400">
            {8 - password.length} more character{8 - password.length !== 1 ? "s" : ""} needed
          </p>
        )}
        {passwordError && <p className="text-[12px] text-red-500">{passwordError}</p>}
      </div>

      {/* Mobile Number */}
      <div className="space-y-1.5">
        <label htmlFor="phone" className="block text-[13px] font-medium text-foreground">Mobile Number</label>
        <div className={box("phone")}>
          <span className="ml-3 flex items-center gap-1 rounded border border-input bg-muted px-2 py-1 text-[12px] font-medium text-muted-foreground">
            🇮🇳 +91
          </span>
          <Phone className="ml-2 h-4 w-4 shrink-0 text-muted-foreground/60" />
          <input id="phone" type="tel" inputMode="tel" placeholder="98765 43210"
            value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            onFocus={() => setFocused("phone")} onBlur={() => setFocused(null)}
            required maxLength={10}
            className="w-full bg-transparent px-3 py-2.5 text-[14px] placeholder:text-muted-foreground/50 focus:outline-none" />
        </div>
        <p className="text-[11px] text-muted-foreground">OTP will be sent to verify this number</p>
        {phoneError && <p className="text-[12px] text-red-500">{phoneError}</p>}
      </div>

      <button type="submit" disabled={loading}
        className="btn-bounce flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-[14px] font-semibold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Sending verifications…</> : "Create Account & Verify"}
      </button>
      <p className="text-center text-[13px] text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-primary hover:underline underline-offset-4">Sign in</Link>
      </p>
    </form>
  );
}

export default RegisterForm;
