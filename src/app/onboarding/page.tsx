"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShoppingBag, Store, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/context/AuthContext";

const OPTIONS = [
  {
    value: "CUSTOMER" as const,
    icon: ShoppingBag,
    title: "I want to shop",
    desc: "Browse and buy from thousands of verified sellers",
  },
  {
    value: "SELLER" as const,
    icon: Store,
    title: "I want to sell",
    desc: "Create your store and reach millions of customers",
  },
];

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const [selected, setSelected] = useState<"CUSTOMER" | "SELLER" | null>(null);
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/sign-in");
      return;
    }

    // Check if email is verified
    if (!authLoading && user && !user.emailVerified) {
      router.replace("/verify-email-pending");
    }
  }, [user, authLoading, router]);

  const handleContinue = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      if (selected === "SELLER") {
        router.push("/become-seller");
      } else {
        router.push("/");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" />
          <p className="text-[13px] text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-xl shadow-black/5 dark:shadow-black/30">
          {/* Header */}
          <div className="border-b border-border/40 px-8 pt-8 pb-6 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground shadow-lg"
            >
              <span className="text-2xl font-black text-background">N</span>
            </motion.div>
            <h1 className="text-[22px] font-bold tracking-tight text-foreground">How will you use NexCart?</h1>
            <p className="mt-1.5 text-[13.5px] text-muted-foreground">
              Choose your primary role. You can always change this later.
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3 p-6">
            {OPTIONS.map((opt, idx) => {
              const isSelected = selected === opt.value;
              const isHovered = hovered === opt.value;
              return (
                <motion.button
                  key={opt.value}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + idx * 0.08, duration: 0.35 }}
                  onClick={() => setSelected(opt.value)}
                  onMouseEnter={() => setHovered(opt.value)}
                  onMouseLeave={() => setHovered(null)}
                  className={`group relative w-full rounded-[10px] border p-5 text-left transition-all duration-200 ${
                    isSelected
                      ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                      : isHovered
                      ? "border-border bg-muted/40"
                      : "border-border/60 bg-card hover:border-border"
                  }`}
                >
                  <div className="relative flex items-center gap-4">
                    {/* Icon */}
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] transition-all duration-200 ${
                        isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <opt.icon className="h-5 w-5" strokeWidth={1.75} />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className={`text-[15px] font-semibold transition-colors ${isSelected ? "text-foreground" : "text-foreground/90"}`}>
                        {opt.title}
                      </div>
                      <div className={`mt-0.5 text-[12.5px] leading-snug transition-colors ${isSelected ? "text-foreground/60" : "text-muted-foreground"}`}>
                        {opt.desc}
                      </div>
                    </div>

                    {/* Check indicator */}
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-border/60 bg-transparent"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white stroke-[2.5]" />}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* CTA */}
          <div className="border-t border-border/40 px-6 pb-6 pt-4">
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.35 }}
              onClick={handleContinue}
              disabled={!selected || loading}
              className={`group flex w-full items-center justify-center gap-2.5 rounded-xl py-3 text-[14.5px] font-semibold transition-all duration-200 ${
                selected
                  ? "bg-foreground text-background shadow-md hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:brightness-95"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background/30 border-t-background" />
                  Setting up…
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 text-center text-[12px] text-muted-foreground/60"
        >
          You can switch roles anytime from your account settings.
        </motion.p>
      </motion.div>
    </div>
  );
}
