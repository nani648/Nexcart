"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Store, Check, BarChart2, ShieldCheck, Users, Zap } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { useAuthContext } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { GSTIN_REGEX } from "@/lib/validations";
import { StoreHandleField } from "@/components/seller/StoreHandleField";
import { suggestHandleFromStoreName } from "@/lib/store-handle";

const BENEFITS = [
  { icon: Users, text: "Reach thousands of active customers" },
  { icon: BarChart2, text: "Analytics and order management dashboard" },
  { icon: ShieldCheck, text: "Secure payments via Razorpay" },
  { icon: Zap, text: "Get a unique seller ID and public store URL" },
];

interface FormData {
  storeName: string;
  description: string;
  gstin: string;
}

const HANDLE_HELP =
  "This is your shareable store link — put it in your Instagram bio. You can change it later.";

export default function BecomeSeller() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: { storeName: "", description: "", gstin: "" },
    mode: "onTouched",
  });

  const descValue = watch("description") ?? "";

  // Handle lives outside react-hook-form because StoreHandleField owns its own
  // async availability state.
  const [storeHandle, setStoreHandle] = useState("");
  const [handleValid, setHandleValid] = useState(true); // optional ⇒ empty is valid
  const storeNameValue = watch("storeName") ?? "";
  const [handleTouched, setHandleTouched] = useState(false);

  // Pre-fill from the store name until the seller edits the handle themselves.
  useEffect(() => {
    if (handleTouched) return;
    const suggested = suggestHandleFromStoreName(storeNameValue);
    setStoreHandle(suggested ?? "");
  }, [storeNameValue, handleTouched]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast.error("You must be logged in to register as a seller.");
      router.push("/sign-in");
      return;
    }
    fetch("/api/sellers/profile", { headers: { Authorization: `Bearer ${user.uid}` } })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          const status = data?.seller?.status;
          if (status === "APPROVED") { toast.info("You already have an active store."); router.replace("/dashboard"); }
          else if (status === "PENDING") { toast.info("Your store is under review."); router.replace("/dashboard"); }
          else if (status === "SUSPENDED") { toast.error("Your store has been suspended."); router.replace("/dashboard"); }
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [user, authLoading, router]);

  const onSubmit = async (data: FormData) => {
    // A handle that failed validation would be rejected by the API anyway;
    // stopping here keeps the error next to the field instead of in a toast.
    if (storeHandle.trim() && !handleValid) {
      toast.error("Please choose an available store handle.");
      return;
    }
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) { toast.error("Not signed in."); router.push("/sign-in"); return; }
      const res = await fetch("/api/sellers", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentUser.uid}` },
        body: JSON.stringify({ storeName: data.storeName.trim(), storeHandle: storeHandle.trim() || undefined, description: data.description?.trim(), gstin: data.gstin?.trim() ? data.gstin.trim().toUpperCase() : undefined, email: currentUser.email, name: currentUser.displayName }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to register store");
      toast.success("Store registered! Awaiting admin approval.");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">

          {/* LEFT */}
          <div className="flex flex-col justify-center">
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-[10px] bg-foreground">
              <Store className="h-5 w-5 text-background" />
            </div>
            <h1 className="mt-4 text-[28px] font-semibold tracking-tight leading-snug">
              Start selling on NexCart
            </h1>
            <p className="mt-2 text-[14px] text-muted-foreground leading-relaxed max-w-sm">
              Create your free store and reach thousands of buyers across India. Setup takes less than 2 minutes.
            </p>
            <div className="mt-8 space-y-3">
              {BENEFITS.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-primary/8 text-primary">
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <span className="text-[13px] text-muted-foreground">{text}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 flex items-center gap-3 rounded-[10px] border border-border/60 bg-muted/20 p-4">
              <Check className="h-4 w-4 shrink-0 text-emerald-500" />
              <p className="text-[12px] text-muted-foreground">
                Your store will be reviewed by our team within <span className="font-medium text-foreground">24 hours</span>.
              </p>
            </div>
          </div>

          {/* RIGHT — form */}
          <div>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5 rounded-[10px] border border-border/60 bg-white dark:bg-card p-6 shadow-[var(--shadow-xs)]"
              noValidate
            >
              <div>
                <h2 className="text-[15px] font-semibold mb-0.5">Store details</h2>
                <p className="text-[12px] text-muted-foreground">This will be visible to your customers.</p>
              </div>

              {/* Store Name */}
              <div className="space-y-1.5">
                <label htmlFor="storeName" className="text-[13px] font-medium">
                  Store Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="storeName"
                  type="text"
                  placeholder="e.g. Hema Products"
                  className={`w-full rounded-[8px] border px-3 py-2.5 text-[13px] bg-background outline-none focus:ring-2 focus:ring-ring transition-colors ${errors.storeName ? "border-red-400 focus:ring-red-300" : "border-input"}`}
                  {...register("storeName", {
                    required: "Store name is required",
                    minLength: { value: 3, message: "Store name must be at least 3 characters" },
                    maxLength: { value: 100, message: "Store name is too long" },
                    validate: (v) => v.trim().length >= 3 || "Store name must be at least 3 characters",
                  })}
                />
                {errors.storeName && (
                  <p className="text-[12px] text-red-500">{errors.storeName.message}</p>
                )}
              </div>

              {/* Store Handle — the shareable vanity URL */}
              <StoreHandleField
                value={storeHandle}
                onChange={(v) => { setHandleTouched(true); setStoreHandle(v); }}
                onValidityChange={setHandleValid}
                helpText={HANDLE_HELP}
              />

              {/* Store Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="description" className="text-[13px] font-medium">Store Description</label>
                  <span className={`text-[11px] tabular-nums ${descValue.length > 220 ? "text-red-500" : "text-muted-foreground/60"}`}>
                    {descValue.length}/250
                  </span>
                </div>
                <textarea
                  id="description"
                  rows={4}
                  maxLength={250}
                  placeholder="Tell customers what you sell and what makes your store unique…"
                  className="w-full resize-none rounded-[8px] border border-input bg-background px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-ring transition-colors"
                  {...register("description")}
                />
              </div>

              {/* GSTIN */}
              <div className="space-y-1.5">
                <label htmlFor="gstin" className="text-[13px] font-medium">
                  GSTIN <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  id="gstin"
                  type="text"
                  placeholder="e.g. 27ABCDE1234F1Z5"
                  maxLength={15}
                  className={`w-full rounded-[8px] border px-3 py-2.5 text-[13px] uppercase bg-background outline-none focus:ring-2 focus:ring-ring transition-colors ${errors.gstin ? "border-red-400 focus:ring-red-300" : "border-input"}`}
                  {...register("gstin", {
                    validate: (v) =>
                      !v || !v.trim() || GSTIN_REGEX.test(v.trim().toUpperCase()) ||
                      "Enter a valid 15-character GSTIN (e.g. 27ABCDE1234F1Z5)",
                  })}
                />
                {errors.gstin ? (
                  <p className="text-[12px] text-red-500">{errors.gstin.message}</p>
                ) : (
                  <p className="text-[12px] text-muted-foreground">
                    You can add this later, but it&apos;s required before you can request a payout.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-[10px] bg-primary py-3 text-[14px] font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading ? "Registering…" : "Create My Store"}
              </button>
            </form>
          </div>

        </div>
      </main>
    </>
  );
}
