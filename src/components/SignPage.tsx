"use client";

import { motion, AnimatePresence, useSpring } from "framer-motion";
import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail, Lock, User, Chrome, ShieldCheck, ArrowLeft, Eye, EyeOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AtmosphericBackground } from "./layout/AtmosphericBackground";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  auth,
  signInWithGoogle,
  signInWithPopup,
  signOut,
  googleProvider,
  resetPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "@/lib/firebase";
import { linkWithCredential, EmailAuthProvider, getAuth, inMemoryPersistence, setPersistence } from "firebase/auth";
import type { ConfirmationResult } from "firebase/auth";
import { initializeApp, getApp, deleteApp } from "firebase/app";

const getStrengthConfig = (password: string) => {
  if (!password) {
    return { percent: 0, label: "None", colorClass: "bg-white/10", glowClass: "", textColor: "text-white/30" };
  }
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const checks = [hasMinLength, hasUpper, hasLower, hasNumber, hasSymbol];
  const satisfiedCount = checks.filter(Boolean).length;

  if (password.length < 6) {
    return { percent: 20, label: "Very Weak", colorClass: "bg-red-500", glowClass: "shadow-[0_0_12px_rgba(239,68,68,0.4)]", textColor: "text-red-400" };
  }
  switch (satisfiedCount) {
    case 1:
    case 2:
      return { percent: 40, label: "Weak", colorClass: "bg-orange-500", glowClass: "shadow-[0_0_12px_rgba(249,115,22,0.4)]", textColor: "text-orange-400" };
    case 3:
      return { percent: 60, label: "Medium", colorClass: "bg-yellow-500", glowClass: "shadow-[0_0_12px_rgba(234,179,8,0.4)]", textColor: "text-yellow-400" };
    case 4:
      return { percent: 80, label: "Strong", colorClass: "bg-indigo-400", glowClass: "shadow-[0_0_12px_rgba(129,140,248,0.4)]", textColor: "text-indigo-400" };
    case 5:
    default:
      return { percent: 100, label: "Excellent", colorClass: "bg-emerald-400", glowClass: "shadow-[0_0_12px_rgba(52,211,153,0.4)]", textColor: "text-emerald-400" };
  }
};

export default function SignPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot-password" | "verify-otp">("signin");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", phone: "" });
  const [otpCode, setOtpCode] = useState("");
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<InstanceType<typeof RecaptchaVerifier> | null>(null);

  const strengthConfig = React.useMemo(() => getStrengthConfig(formData.password), [formData.password]);

  const passwordCriteria = React.useMemo(() => [
    { label: "8+ Chars",       test: (pwd: string) => pwd.length >= 8 },
    { label: "Lowercase",      test: (pwd: string) => /[a-z]/.test(pwd) },
    { label: "Uppercase",      test: (pwd: string) => /[A-Z]/.test(pwd) },
    { label: "Number (0-9)",   test: (pwd: string) => /[0-9]/.test(pwd) },
    { label: "Special Symbol", test: (pwd: string) => /[^A-Za-z0-9]/.test(pwd) },
  ], []);

  const cardRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
    if (cardRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
        }
      });
      resizeObserver.observe(cardRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  const progress = React.useMemo(() => {
    if (mode === "forgot-password") return formData.email.length > 0 ? 1 : 0;
    if (mode === "verify-otp") return otpCode.length / 6;
    const fields = mode === "signup" ? ["name", "email", "password", "phone"] : ["email", "password"];
    const filled = fields.filter(f => formData[f as keyof typeof formData].length > 0).length;
    return filled / fields.length;
  }, [formData, mode, otpCode]);

  const animatedProgress = useSpring(progress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const toggleMode = (newMode: "signin" | "signup" | "forgot-password") => {
    setMode(newMode);
    setOtpCode("");
    confirmationResultRef.current = null;
    if (recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current.clear();
      recaptchaVerifierRef.current = null;
    }
    if (newMode !== "forgot-password") {
      setFormData(prev => ({ name: "", email: prev.email, password: "", phone: "" }));
    }
    setShowPassword(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleOAuthLogin = async (provider: "google") => {
    setIsLoading(true);
    try {
      if (provider === "google") {
        if (mode === "signup") {
          // Use a TEMPORARY secondary Firebase app so the main auth state
          // never changes — the sign-up page won't detect a user or redirect.
          const config = getApp().options;
          const tempApp = initializeApp(config, `google-prefill-${Date.now()}`);
          const tempAuth = getAuth(tempApp);
          await setPersistence(tempAuth, inMemoryPersistence);
          try {
            const result = await signInWithPopup(tempAuth, googleProvider);
            const googleEmail = result.user.email ?? "";
            const googleName = result.user.displayName ?? "";
            setFormData(prev => ({ ...prev, name: googleName, email: googleEmail }));
            toast.success("Google verified! Enter your mobile number to complete signup.");
          } finally {
            await signOut(tempAuth).catch(() => {});
            await deleteApp(tempApp).catch(() => {});
          }
        } else {
          await signInWithGoogle();
          toast.success("Welcome to NexCart!");
          router.push("/");
        }
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "OAuth sign-in failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (mode === "forgot-password") {
        await resetPassword(formData.email);
        toast.success("Password reset email sent! Check your inbox.");
        setMode("signin");
        return;
      }

      if (mode === "verify-otp") {
        if (otpCode.length !== 6) { toast.error("Enter the 6-digit OTP."); return; }
        if (!confirmationResultRef.current) { toast.error("Session expired. Please go back and resend OTP."); return; }
        const result = await confirmationResultRef.current.confirm(otpCode);
        const phoneUser = result.user;
        const credential = EmailAuthProvider.credential(formData.email, formData.password);
        await linkWithCredential(phoneUser, credential);
        if (formData.name) await updateProfile(phoneUser, { displayName: formData.name });
        await sendEmailVerification(phoneUser);
        confirmationResultRef.current = null;
        toast.success("Account created! Please verify your email.");
        router.push("/verify-email-pending");
        return;
      }

      if (mode === "signup") {
        const phoneDigits = formData.phone.replace(/\D/g, "");
        if (phoneDigits.length !== 10) { toast.error("Enter a valid 10-digit Indian mobile number."); return; }
        if (recaptchaVerifierRef.current) {
          recaptchaVerifierRef.current.clear();
          recaptchaVerifierRef.current = null;
        }
        const verifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
        recaptchaVerifierRef.current = verifier;
        const confirmResult = await signInWithPhoneNumber(auth, `+91${phoneDigits}`, verifier);
        confirmationResultRef.current = confirmResult;
        setMode("verify-otp");
        toast.success(`OTP sent to +91 ${formData.phone}`);
        return;
      }

      // signin
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      if (rememberMe) localStorage.setItem("rememberedEmail", formData.email);
      else localStorage.removeItem("rememberedEmail");
      toast.success("Welcome back!");
      router.push("/");
    } catch (err: unknown) {
      const msg = (err as Error).message || "An error occurred.";
      if (msg.includes("invalid-credential") || msg.includes("wrong-password")) {
        toast.error("Incorrect email or password.");
      } else if (msg.includes("email-already-in-use")) {
        toast.error("An account with this email already exists.");
      } else if (msg.includes("weak-password")) {
        toast.error("Password must be at least 6 characters.");
      } else if (msg.includes("invalid-verification-code") || msg.includes("invalid-code")) {
        toast.error("Invalid OTP. Please check and try again.");
      } else if (msg.includes("invalid-phone-number")) {
        toast.error("Invalid phone number. Use a valid 10-digit Indian number.");
      } else if (msg.includes("too-many-requests")) {
        toast.error("Too many attempts. Please try again later.");
      } else if (msg.includes("credential-already-in-use")) {
        toast.error("This phone number is already linked to another account.");
      } else {
        toast.error(msg);
      }
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-3 sm:p-4 selection:bg-[#5e5cee] selection:text-white overflow-hidden">
      <AtmosphericBackground />

      <motion.main
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        className="w-full max-w-[440px] relative z-20"
      >
        {/* Card Perimeter Progress SVG */}
        <div className="absolute -inset-4 sm:-inset-8 pointer-events-none z-10 overflow-visible opacity-50">
          <svg
            width={dimensions.width + (dimensions.width < 400 ? 32 : 64)}
            height={dimensions.height + (dimensions.width < 400 ? 32 : 64)}
            viewBox={`0 0 ${dimensions.width + (dimensions.width < 400 ? 32 : 64)} ${dimensions.height + (dimensions.width < 400 ? 32 : 64)}`}
            fill="none"
            className="overflow-visible"
          >
            <motion.path
              d={dimensions.width > 0
                ? `M 16,0 H ${dimensions.width + (dimensions.width < 400 ? 32 : 64) - 16} a 16,16 0 0 1 16,16 V ${dimensions.height + (dimensions.width < 400 ? 32 : 64) - 16} a 16,16 0 0 1 -16,16 H 16 a 16,16 0 0 1 -16,-16 V 16 a 16,16 0 0 1 16,-16`
                : ""}
              stroke="#5e5cee"
              strokeWidth="2"
              strokeLinecap="round"
              style={{
                pathLength: animatedProgress,
                opacity: progress > 0 ? 0.8 : 0,
                filter: "drop-shadow(0 0 12px rgba(94, 92, 238, 0.5))"
              }}
              transition={{ duration: 0.5 }}
            />
          </svg>
        </div>

        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="glass-card rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden border-white/5 perspective-[1200px]"
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-[#5e5cee]/30" />
          <div className="absolute top-0 bottom-0 left-0 w-[1px] bg-[#5e5cee]/10" />

          <motion.div
            className="space-y-5 sm:space-y-6 relative z-10"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } } }}
          >
            <motion.header
              className="space-y-4 text-left"
              variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } } }}
            >
              <div className="space-y-2">
                <div className="overflow-hidden">
                  <motion.h1
                    layout
                    className="text-4xl sm:text-5xl md:text-6xl font-display font-bold tracking-tighter text-white leading-none flex items-baseline gap-2"
                  >
                    Nex
                    <span className="font-serif italic font-normal text-[#ff3366] text-3xl sm:text-4xl md:text-5xl animate-[pulse_3s_infinite_ease-in-out]">
                      Connect
                    </span>
                  </motion.h1>
                </div>
              </div>
            </motion.header>

            {/* Mode Selector Toggle */}
            <AnimatePresence mode="wait">
              {mode !== "forgot-password" && mode !== "verify-otp" ? (
                <motion.div
                  key="selector"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex p-1 bg-white/5 rounded-full border border-[#5e5cee]/10 relative overflow-hidden"
                  variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.6 } } }}
                >
                  <button
                    type="button"
                    onClick={() => mode !== "signin" && toggleMode("signin")}
                    className={`flex-1 py-3 text-[10px] uppercase tracking-[0.3em] font-bold rounded-full transition-all duration-500 relative z-10 ${mode === "signin" ? "text-white" : "text-white/30 hover:text-white/60 active:scale-95"}`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => mode !== "signup" && toggleMode("signup")}
                    className={`flex-1 py-3 text-[10px] uppercase tracking-[0.3em] font-bold rounded-full transition-all duration-500 relative z-10 ${mode === "signup" ? "text-white" : "text-white/30 hover:text-white/60 active:scale-95"}`}
                  >
                    Create Account
                  </button>
                  <motion.div
                    className="absolute inset-y-1 bg-[#5e5cee] rounded-full shadow-[0_0_20px_rgba(94,92,238,0.3)]"
                    initial={false}
                    animate={{ left: mode === "signin" ? "4px" : "50%", right: mode === "signin" ? "50%" : "4px" }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                </motion.div>
              ) : mode === "forgot-password" ? (
                <motion.div
                  key="forgot-header"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-4"
                >
                  <Button variant="ghost" size="icon" onClick={() => setMode("signin")}
                    className="rounded-full hover:bg-white/10 text-[#5e5cee] hover:text-[#7d7be5] hover:shadow-[0_0_15px_rgba(94,92,238,0.2)] transition-all duration-300">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="space-y-1">
                    <h2 className="text-white font-bold text-lg tracking-tight">Reset Password</h2>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">Enter email to recover access</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="verify-otp-header"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-4"
                >
                  <Button variant="ghost" size="icon" onClick={() => toggleMode("signup")}
                    className="rounded-full hover:bg-white/10 text-[#5e5cee] hover:text-[#7d7be5] hover:shadow-[0_0_15px_rgba(94,92,238,0.2)] transition-all duration-300">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="space-y-1">
                    <h2 className="text-white font-bold text-lg tracking-tight">Verify Mobile</h2>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest">Enter the OTP sent to your number</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {mode !== "forgot-password" && (
              <motion.div className="grid grid-cols-1 gap-4" variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
                <Button variant="outline" onClick={() => handleOAuthLogin("google")} disabled={isLoading}
                  className="h-12 rounded-full border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:border-[#5e5cee]/20 hover:text-white hover:shadow-[0_0_30px_rgba(94,92,238,0.08)] gap-3 font-medium tracking-tight text-sm transition-all duration-700 group/oauth relative overflow-hidden"
                >
                  <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#5e5cee]/10 to-transparent -translate-x-[100%] group-hover/oauth:translate-x-[100%] transition-transform duration-1000" />
                  <Chrome className="h-4 w-4 group-hover/oauth:scale-110 group-hover/oauth:rotate-[15deg] transition-transform duration-500" />
                  <span className="relative z-10">{mode === "signin" ? "Sign in with Google" : "Sign up with Google"}</span>
                </Button>
              </motion.div>
            )}

            {mode !== "forgot-password" && (
              <motion.div className="relative py-1" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 1 } } }}>
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#5e5cee]/5" />
                </div>
                <div className="relative flex justify-center text-[9px] uppercase tracking-[0.5em] font-medium">
                  <span className="bg-[#080c16] px-4 text-[#5e5cee]/20 italic">OR</span>
                </div>
              </motion.div>
            )}

            <motion.form key={mode} onSubmit={handleSubmit} className="space-y-3" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>

              {/* Signup info banner */}
              <AnimatePresence mode="popLayout" initial={false}>
                {mode === "signup" && (
                  <motion.div
                    variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 bg-[#5e5cee]/5 border border-[#5e5cee]/10 rounded-xl mb-6 flex gap-3 items-start"
                  >
                    <ShieldCheck className="h-5 w-5 text-[#5e5cee]/40 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-indigo-100/40 leading-relaxed">
                      Both <span className="text-[#5e5cee] font-medium">email</span> and <span className="text-[#5e5cee] font-medium">mobile number</span> will be verified and linked to your account.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Full Name (signup only) */}
              <AnimatePresence mode="popLayout" initial={false}>
                {mode === "signup" && (
                  <motion.div
                    variants={{ hidden: { opacity: 0, x: -15, y: 10 }, visible: { opacity: 1, x: 0, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } } }}
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="name" className="text-[11px] uppercase tracking-widest text-white/50 ml-1 font-bold">Full Name</Label>
                    <div className="relative group transition-transform duration-300 focus-within:scale-[1.01]">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/10 group-focus-within:text-[#5e5cee] transition-colors" />
                      <Input id="name" placeholder="Krishna Murthy" value={formData.name} onChange={handleInputChange}
                        className="glass-input pl-12 h-12 rounded-full border-white/10 bg-white/5 text-white placeholder:text-white/20 transition-all" required />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              {mode !== "verify-otp" && (
              <motion.div className="space-y-2"
                variants={{ hidden: { opacity: 0, x: -15, y: 10 }, visible: { opacity: 1, x: 0, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } } }}
              >
                <Label htmlFor="email" className="text-[11px] uppercase tracking-widest text-white/50 ml-1 font-bold">Email</Label>
                <div className="relative group transition-all duration-300">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-[#5e5cee] transition-colors" />
                  <Input id="email" type="email" placeholder="you@example.com" value={formData.email} onChange={handleInputChange}
                    className="glass-input pl-12 h-12 rounded-full border-white/10 bg-white/5 text-white placeholder:text-white/20 transition-all" required />
                </div>
              </motion.div>
              )}

              {/* Password */}
              <AnimatePresence mode="popLayout" initial={false}>
                {mode !== "forgot-password" && mode !== "verify-otp" && (
                  <motion.div className="space-y-2"
                    variants={{ hidden: { opacity: 0, x: -15, y: 10 }, visible: { opacity: 1, x: 0, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } } }}
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  >
                    <div className="flex items-center justify-between ml-1">
                      <Label htmlFor="password" className="text-[11px] uppercase tracking-widest text-white/50 font-bold">Password</Label>
                      {mode === "signin" && (
                        <button type="button" onClick={() => setMode("forgot-password")}
                          className="text-[10px] text-[#5e5cee]/70 hover:text-[#5e5cee] transition-all duration-300 hover:scale-105 active:scale-95 uppercase tracking-widest font-bold">
                          Forgot?
                        </button>
                      )}
                    </div>
                    <div className="relative group transition-all duration-300">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-[#5e5cee] transition-colors" />
                      <Input id="password" type={showPassword ? "text" : "password"} placeholder="Min. 8 characters"
                        value={formData.password} onChange={handleInputChange}
                        className="glass-input pl-12 pr-12 h-12 rounded-full border-white/10 bg-white/5 text-white placeholder:text-white/20 transition-all"
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full text-white/20 hover:text-[#5e5cee] hover:bg-[#5e5cee]/10 hover:shadow-[0_0_10px_rgba(94,92,238,0.1)] transition-all duration-300 active:scale-90"
                        aria-label={showPassword ? "Hide password" : "Show password"}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Real-time Password Strength Meter */}
                    <AnimatePresence initial={false}>
                      {mode === "signup" && formData.password.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                          exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          transition={{ duration: 0.35, ease: "easeInOut" }}
                          className="space-y-2.5 overflow-hidden border-t border-[#5e5cee]/5 pt-2.5"
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold tracking-widest uppercase">
                            <span className="text-white/40">Strength Check</span>
                            <span className={cn("transition-colors duration-300 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-white/5 border border-white/5", strengthConfig.textColor)}>
                              {strengthConfig.label}
                            </span>
                          </div>
                          {/* Glow-enhanced Progress Bar */}
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/5 relative">
                            <motion.div
                              className={cn("h-full rounded-full transition-all duration-500", strengthConfig.colorClass, strengthConfig.glowClass)}
                              initial={{ width: "0%" }}
                              animate={{ width: `${strengthConfig.percent}%` }}
                              transition={{ type: "spring", stiffness: 80, damping: 15 }}
                            />
                          </div>
                          {/* Requirements Checklist */}
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1">
                            {passwordCriteria.map((criterion, idx) => {
                              const isMet = criterion.test(formData.password);
                              return (
                                <div key={idx} className="flex items-center gap-1.5 transition-all duration-300">
                                  <div className={cn(
                                    "h-3.5 w-3.5 rounded-full flex items-center justify-center shrink-0 border transition-all duration-500",
                                    isMet
                                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.2)]"
                                      : "bg-white/5 border-white/10 text-white/20"
                                  )}>
                                    {isMet ? <Check className="h-2 w-2 stroke-[5]" /> : <div className="h-1 w-1 rounded-full bg-white/30" />}
                                  </div>
                                  <span className={cn("text-[9px] uppercase tracking-wider font-bold transition-all duration-500 select-none", isMet ? "text-emerald-400" : "text-white/30")}>
                                    {criterion.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Remember Me (signin only) */}
              <AnimatePresence mode="popLayout" initial={false}>
                {mode === "signin" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center space-x-2 pt-1 pb-2 ml-1"
                  >
                    <div className="relative flex items-center">
                      <input type="checkbox" id="rememberMe" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                        className="peer h-4 w-4 shrink-0 rounded-sm border border-[#5e5cee]/30 bg-white/5 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 checked:bg-[#5e5cee] checked:text-white appearance-none cursor-pointer hover:border-[#5e5cee]/60 transition-all"
                      />
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity">
                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <label htmlFor="rememberMe" className="text-[10px] uppercase tracking-widest text-white/50 font-bold cursor-pointer select-none hover:text-white/70 transition-colors">
                      Remember Me
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Mobile Number (signup only) */}
              <AnimatePresence mode="popLayout" initial={false}>
                {mode === "signup" && (
                  <motion.div
                    variants={{ hidden: { opacity: 0, x: -15, y: 10 }, visible: { opacity: 1, x: 0, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } } }}
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="phone" className="text-[11px] uppercase tracking-widest text-white/50 ml-1 font-bold">Mobile Number</Label>
                    <div className="relative group transition-all duration-300">
                      <div className="absolute left-1 top-1 bottom-1 flex items-center px-5 bg-white/10 rounded-full text-[10px] text-[#5e5cee] font-bold tracking-widest border border-white/5">
                        IN +91
                      </div>
                      <Input id="phone" type="tel" placeholder="98765 43210" value={formData.phone} onChange={handleInputChange}
                        className="glass-input pl-28 h-12 rounded-full border-white/10 bg-white/5 text-white placeholder:text-white/20 transition-all" required />
                    </div>
                    <p className="text-[9px] text-[#5e5cee]/30 uppercase tracking-widest ml-1">OTP will be sent to verify this number</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* OTP Input (verify-otp mode only) */}
              <AnimatePresence mode="popLayout" initial={false}>
                {mode === "verify-otp" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    <div className="p-4 bg-[#5e5cee]/5 border border-[#5e5cee]/10 rounded-xl flex gap-3 items-start">
                      <ShieldCheck className="h-5 w-5 text-[#5e5cee]/40 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-indigo-100/40 leading-relaxed">
                        OTP sent to <span className="text-[#5e5cee] font-medium">+91 {formData.phone}</span>. Enter the 6-digit code below to verify your number.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] uppercase tracking-widest text-white/50 ml-1 font-bold">6-Digit OTP</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder="· · · · · ·"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="glass-input text-center h-14 rounded-full border-white/10 bg-white/5 text-white placeholder:text-white/30 text-2xl tracking-[0.6em] font-bold transition-all"
                        autoFocus
                      />
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const phoneDigits = formData.phone.replace(/\D/g, "");
                          if (recaptchaVerifierRef.current) {
                            recaptchaVerifierRef.current.clear();
                            recaptchaVerifierRef.current = null;
                          }
                          const verifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
                          recaptchaVerifierRef.current = verifier;
                          const confirmResult = await signInWithPhoneNumber(auth, `+91${phoneDigits}`, verifier);
                          confirmationResultRef.current = confirmResult;
                          setOtpCode("");
                          toast.success("OTP resent!");
                        } catch {
                          if (recaptchaVerifierRef.current) {
                            recaptchaVerifierRef.current.clear();
                            recaptchaVerifierRef.current = null;
                          }
                          toast.error("Failed to resend OTP. Please try again.");
                        }
                      }}
                      className="w-full text-center text-[10px] uppercase tracking-widest text-[#5e5cee]/40 hover:text-[#5e5cee] transition-colors font-bold py-1"
                    >
                      Didn&apos;t receive it? Resend OTP
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 } } }}>
                <Button type="submit"
                  className="w-full h-12 rounded-full bg-[#5e5cee]/90 text-white hover:bg-[#5250db] shadow-[0_4px_20px_rgba(94,92,238,0.15)] hover:shadow-[0_8px_40px_rgba(94,92,238,0.3)] transition-all duration-700 font-bold uppercase tracking-[0.2em] text-[10px] group flex items-center justify-center gap-2 relative overflow-hidden"
                  disabled={isLoading}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"
                    style={{ skewX: -25 }}
                  />
                  {isLoading ? (
                    <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span className="relative z-10 transition-transform duration-500 group-hover:scale-[1.02]">
                        {mode === "signin" ? "Initialize Connection" : mode === "signup" ? "Send OTP" : mode === "verify-otp" ? "Verify & Create Account" : "Send Recovery Link"}
                      </span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 group-hover:text-white transition-all duration-500 relative z-10" />
                    </>
                  )}
                </Button>
              </motion.div>
            </motion.form>

            {/* Bottom Links & Pagination Indicators */}
            <div className="flex flex-col items-center gap-4 pt-4 border-t border-[#5e5cee]/5">
              <p className="text-xs text-white/45 tracking-tight font-sans">
                {mode === "signin" ? (
                  <>New here?{" "}<button type="button" onClick={() => toggleMode("signup")} className="text-[#5e5cee] font-semibold hover:underline cursor-pointer">Create an account</button></>
                ) : mode === "signup" ? (
                  <>Already have an account?{" "}<button type="button" onClick={() => toggleMode("signin")} className="text-[#5e5cee] font-semibold hover:underline cursor-pointer">Sign In</button></>
                ) : mode === "verify-otp" ? (
                  <button type="button" onClick={() => toggleMode("signup")} className="text-[#5e5cee] font-semibold hover:underline cursor-pointer">← Back to Signup</button>
                ) : (
                  <button type="button" onClick={() => toggleMode("signin")} className="text-[#5e5cee] font-semibold hover:underline cursor-pointer">Back to Sign In</button>
                )}
              </p>
              <div className="flex items-center gap-1.5 justify-center mt-1">
                <span className={`h-1.5 rounded-full transition-all duration-500 ${mode === "signin" ? "w-6 bg-[#5e5cee]" : "w-1.5 bg-[#5e5cee]/20"}`} />
                <span className={`h-1.5 rounded-full transition-all duration-500 ${mode === "signup" ? "w-6 bg-[#5e5cee]" : "w-1.5 bg-[#5e5cee]/20"}`} />
                <span className={`h-1.5 rounded-full transition-all duration-500 ${mode === "verify-otp" ? "w-6 bg-[#5e5cee]" : "w-1.5 bg-[#5e5cee]/20"}`} />
                <span className={`h-1.5 rounded-full transition-all duration-500 ${mode === "forgot-password" ? "w-6 bg-[#5e5cee]" : "w-1.5 bg-[#5e5cee]/20"}`} />
              </div>
            </div>

          </motion.div>
        </motion.div>
      </motion.main>

      <div id="recaptcha-container" className="hidden" />
    </div>
  );
}
