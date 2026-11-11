"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import type { ConfirmationResult } from "firebase/auth";

export function PhoneLogin({ redirectTo = "/" }: { redirectTo?: string }) {
  const router = useRouter();
  const { sendPhoneOTP, verifyPhoneOTP, loading, error } = useAuth();

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure Indian phone numbers include country code
    const formatted = phone.startsWith("+") ? phone : `+91${phone.replace(/^0/, "")}`;
    try {
      confirmationRef.current = await sendPhoneOTP(formatted, "recaptcha-container");
      setStep("otp");
    } catch {
      // error from hook
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationRef.current) return;
    try {
      await verifyPhoneOTP(confirmationRef.current, otp);
      router.push(redirectTo);
    } catch {
      // error from hook
    }
  };

  return (
    <div className="space-y-4">
      {/* Invisible reCAPTCHA container — required by Firebase Phone Auth */}
      <div id="recaptcha-container" />

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.replace("Firebase: ", "").replace(/\(auth\/.*\)/, "").trim()}
        </div>
      )}

      {step === "phone" ? (
        <form onSubmit={handleSendOTP} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Mobile Number</Label>
            <div className="flex gap-2">
              <span className="flex items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                🇮🇳 +91
              </span>
              <Input
                id="phone"
                type="tel"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                required
                maxLength={10}
                inputMode="tel"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              We&apos;ll send a 6-digit OTP to this number
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading || phone.length < 10}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send OTP
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="otp">Enter OTP</Label>
            <Input
              id="otp"
              type="text"
              placeholder="6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              required
              maxLength={6}
              inputMode="numeric"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              OTP sent to +91 {phone}
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading || otp.length < 6}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Verify OTP
          </Button>

          <button
            type="button"
            onClick={() => { setStep("phone"); setOtp(""); }}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Change number
          </button>
        </form>
      )}
    </div>
  );
}

export default PhoneLogin;
