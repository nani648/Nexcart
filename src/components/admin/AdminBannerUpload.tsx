"use client";

import { useState } from "react";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { ImageIcon, X } from "lucide-react";

interface Props {
  sellerId: string;
  currentBanner: string | null;
}

export function AdminBannerUpload({ sellerId, currentBanner }: Props) {
  const [open, setOpen] = useState(false);
  const [urls, setUrls] = useState<string[]>(currentBanner ? [currentBanner] : []);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const token = auth.currentUser?.uid;
      const res = await fetch("/api/admin/sellers", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sellerId, banner: urls[0] || null }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Banner updated");
      setOpen(false);
    } catch {
      toast.error("Failed to update banner");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted transition-colors"
      >
        <ImageIcon className="h-3 w-3" />
        {currentBanner ? "Banner" : "Set Banner"}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Update Store Banner</h3>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1 hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">Recommended: 1200×300px landscape image</p>
        <ImageUpload
          value={urls}
          onChange={setUrls}
          maxImages={1}
          folder="nexcart/banners"
          authToken={auth.currentUser?.uid}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? "Saving..." : "Save Banner"}
          </button>
        </div>
      </div>
    </div>
  );
}
