"use client";

/**
 * Seller → Scrolling Design.
 *
 * Store-wide setting (unlike Product Card Border, which is per-product) —
 * saved as a single `{ enabled, effect }` object via PATCH /api/sellers/profile,
 * the same shape/flow already used for shakeConfig and floatingBarConfig.
 * Each option shows a live mini-preview using the exact same overlay
 * component that renders on the real storefront, so what the seller sees
 * here is exactly what shoppers will see.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Wand2, Check } from "lucide-react";
import { auth } from "@/lib/firebase";
import { SCROLLING_DESIGNS } from "@/lib/scrolling-designs";
import { ScrollingDesignOverlay } from "@/components/seller/ScrollingDesignOverlay";

function getUid() {
  return (
    auth.currentUser?.uid ??
    (() => {
      try {
        return localStorage.getItem("nxc-uid");
      } catch {
        return null;
      }
    })()
  );
}

export function ScrollingDesignSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // key currently being saved, or "off"
  const [selected, setSelected] = useState<string | null>(null); // null = off

  useEffect(() => {
    let cancelled = false;
    const uid = getUid();
    fetch("/api/sellers/profile", { headers: uid ? { Authorization: `Bearer ${uid}` } : {} })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const sd = data?.seller?.scrollingDesign as { enabled?: boolean; effect?: string } | null | undefined;
        setSelected(sd?.enabled && sd.effect ? sd.effect : null);
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load your current scrolling design");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async (effect: string | null) => {
    setSaving(effect ?? "off");
    try {
      const uid = getUid();
      const res = await fetch("/api/sellers/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(uid ? { Authorization: `Bearer ${uid}` } : {}) },
        body: JSON.stringify({
          scrollingDesign: effect ? { enabled: true, effect } : { enabled: false, effect: "" },
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setSelected(effect);
      toast.success(effect ? "Scrolling design applied to your storefront!" : "Scrolling design turned off.");
    } catch {
      toast.error("Could not save your scrolling design");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-card p-5 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your scrolling design…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-4">
      <div>
        <h2 className="text-sm font-medium flex items-center gap-2">
          <Wand2 className="h-4 w-4" /> Interactive Storefront Effect
        </h2>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Pick one effect, or turn it off. On your live storefront it bursts from the cursor as shoppers move the
          mouse, and from scrolling/touch on mobile — the previews below auto-play so you can see the look, since
          there&apos;s no real page here to scroll.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Off */}
        <button
          type="button"
          onClick={() => selected !== null && save(null)}
          disabled={saving !== null}
          className={`relative flex flex-col overflow-hidden rounded-xl border text-left transition-colors ${
            selected === null ? "border-foreground/60 ring-1 ring-foreground/20" : "border-border hover:border-foreground/30"
          }`}
        >
          <div className="flex h-24 items-center justify-center bg-muted/40 text-[12px] text-muted-foreground">
            No overlay
          </div>
          <div className="flex items-center justify-between gap-2 p-3">
            <div>
              <p className="text-[13px] font-medium">Off</p>
              <p className="text-[11px] text-muted-foreground">Plain banner, no animation.</p>
            </div>
            {selected === null ? (
              <Check className="h-4 w-4 shrink-0 text-foreground" />
            ) : saving === "off" ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            ) : null}
          </div>
        </button>

        {SCROLLING_DESIGNS.map((d) => {
          const isSelected = selected === d.key;
          const isSaving = saving === d.key;
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => !isSelected && save(d.key)}
              disabled={saving !== null}
              className={`relative flex flex-col overflow-hidden rounded-xl border text-left transition-colors ${
                isSelected ? "border-foreground/60 ring-1 ring-foreground/20" : "border-border hover:border-foreground/30"
              }`}
            >
              <div className="relative h-24 overflow-hidden bg-[radial-gradient(ellipse_at_50%_0%,rgba(30,41,59,0.9),rgba(15,23,42,1))]">
                <ScrollingDesignOverlay design={{ enabled: true, effect: d.key }} mode="demo" />
              </div>
              <div className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{d.label}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{d.description}</p>
                </div>
                {isSelected ? (
                  <Check className="h-4 w-4 shrink-0 text-foreground" />
                ) : isSaving ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
