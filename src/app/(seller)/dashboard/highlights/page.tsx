"use client";

import { useState, useEffect } from "react";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { Home, Images, Sparkles, ExternalLink } from "lucide-react";

export default function HighlightsPage() {
  const [highlights, setHighlights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid ?? (() => { try { return localStorage.getItem("nxc-uid"); } catch { return null; } })();
    if (!uid) return;
    fetch("/api/sellers/highlights", { headers: { Authorization: `Bearer ${uid}` } })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data) setHighlights(data.highlights ?? []); })
      .catch(() => toast.error("Failed to load highlights"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const uid = auth.currentUser?.uid ?? (() => { try { return localStorage.getItem("nxc-uid"); } catch { return null; } })();
      const res = await fetch("/api/sellers/highlights", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(uid ? { Authorization: `Bearer ${uid}` } : {}),
        },
        body: JSON.stringify({ highlights }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed");
      }
      toast.success("Highlights saved! Visible on your store page.");
    } catch (e) {
      toast.error(`Failed to save highlights: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Link href="/" className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
              <Home className="h-3.5 w-3.5" />
              <span>Home</span>
            </Link>
            <span className="text-muted-foreground/50 text-[12px]">/</span>
            <span className="text-[12px] text-foreground font-medium">Highlights</span>
          </div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Store Highlights
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Upload promotional images that auto-slide on your store page to grab customers&apos; attention.
          </p>
        </div>
        <Link href="/">
          <button className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-sm">
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Home</span>
          </button>
        </Link>
      </div>

      {/* Info banner */}
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/15 px-4 py-3 flex items-start gap-3">
        <Images className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-[13px] font-semibold text-amber-800 dark:text-amber-300">How Highlights Work</p>
          <p className="text-[12px] text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
            Upload up to <strong>8 images</strong> (banners, offers, new arrivals). They will appear as an
            auto-sliding carousel at the top of your store page, visible to all customers who visit.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border/50 p-8 flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-5 max-w-2xl">
          <div className="rounded-xl border border-border/50 p-5 space-y-4">
            <div>
              <h2 className="font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Highlight Images
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Recommended: 1200×400px banners · JPG or PNG · Max 5MB each
              </p>
            </div>
            <ImageUpload
              value={highlights}
              onChange={setHighlights}
              maxImages={8}
              folder="nexcart/highlights"
              authToken={auth.currentUser?.uid}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? "Saving…" : "Save Highlights"}
            </Button>
            {highlights.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {highlights.length} image{highlights.length !== 1 ? "s" : ""} will appear on your store
              </p>
            )}
          </div>

          {highlights.length > 0 && (
            <div className="rounded-xl border border-border/50 p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px] font-medium">Preview on your store</p>
                <p className="text-xs text-muted-foreground mt-0.5">See how highlights look to customers</p>
              </div>
              <Link
                href={`/store/${typeof window !== "undefined" ? window.location.pathname.split("/")[2] || "" : ""}`}
                target="_blank"
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View Store
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
