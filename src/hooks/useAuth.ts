"use client";

import { useState } from "react";
import {
  auth,
  googleProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification,
} from "@/lib/firebase";
import { signOut as firebaseSignOut, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { toast } from "sonner";
import type { ConfirmationResult } from "firebase/auth";

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Email / Password sign-up ──────────────────────────────────────────────
  const signUpWithEmail = async (
    email: string,
    password: string,
    displayName?: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }
      // Send email verification link
      await sendEmailVerification(cred.user, {
        url: `${window.location.origin}/verify-email?continueUrl=/onboarding`,
        handleCodeInApp: true,
      });
      toast.success("Verification email sent! Check your inbox.");
      // Sync user to DB (phone will be added after OTP verification)
      await syncUserToDB(cred.user.uid, email, displayName ?? null, null, null);
      return cred.user;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign up failed";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ── Email / Password sign-in ──────────────────────────────────────────────
  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!cred.user.emailVerified) {
        await sendEmailVerification(cred.user, {
          url: `${window.location.origin}/verify-email?continueUrl=/`,
          handleCodeInApp: true,
        });
        await firebaseSignOut(auth);
        toast.error(
          "Please verify your email first. Check your inbox for the verification link."
        );
        throw new Error("Email not verified");
      }
      return cred.user;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ── Google sign-in ────────────────────────────────────────────────────────
  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const { user } = cred;
      await syncUserToDB(user.uid, user.email ?? "", user.displayName, user.photoURL, null);
      return user;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google sign in failed";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ── Phone OTP — send ──────────────────────────────────────────────────────
  const sendPhoneOTP = async (
    phoneNumber: string,
    recaptchaContainerId: string
  ): Promise<ConfirmationResult> => {
    setLoading(true);
    setError(null);
    try {
      const recaptcha = new RecaptchaVerifier(auth, recaptchaContainerId, {
        size: "invisible",
      });
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, recaptcha);
      return confirmation;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send OTP";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ── Phone OTP — verify + save phone to account ────────────────────────────
  // phoneRaw = digits only (no country code) — we store "+91XXXXXXXXXX" in DB
  const verifyPhoneOTP = async (
    confirmation: ConfirmationResult,
    otp: string,
    phoneRaw?: string   // optional: 10-digit raw number to store in DB
  ) => {
    setLoading(true);
    setError(null);
    try {
      const cred = await confirmation.confirm(otp);
      const { user } = cred;
      const phoneForDB = phoneRaw
        ? `+91${phoneRaw.replace(/\D/g, "")}`
        : (user.phoneNumber ?? "");
      // Sync with phone number attached
      await syncUserToDB(
        user.uid,
        user.email ?? user.phoneNumber ?? "",
        user.displayName,
        user.photoURL,
        phoneForDB
      );
      return user;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid OTP";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    await signOut(auth);
  };

  return {
    loading,
    error,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    sendPhoneOTP,
    verifyPhoneOTP,
    logout,
  };
}

// ── Sync Firebase user to Prisma DB ──────────────────────────────────────────
async function syncUserToDB(
  firebaseUid: string,
  email: string,
  name: string | null | undefined,
  avatar: string | null | undefined,
  phone: string | null | undefined
) {
  try {
    await fetch("/api/auth/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // NOTE: this is the raw UID, not a signed ID token — the server only
        // accepts it via a non-production fallback (src/lib/auth.ts). The
        // fetch patch in src/lib/firebase.ts swaps this for a real token
        // before the request leaves the browser; do not copy this pattern
        // into new call sites.
        Authorization: `Bearer ${firebaseUid}`,
      },
      body: JSON.stringify({ firebaseUid, email, name, avatar, phone }),
    });
  } catch {
    // Non-blocking
  }
}

export default useAuth;
