"use client";

import { useRef, useState, useCallback } from "react";
import { RotateCcw, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { resolveCardDesign } from "@/lib/card-designs";
import { auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";

interface ImagePositionPickerProps {
  /** The product's cover photo (images[0]) — no picker renders without one. */
  image: string;
  /** Current focal point, "X% Y%" (0-100 each), or null/undefined for center. */
  value?: string | null;
  onChange: (value: string) => void;
  /** Used to size the box at the same aspect ratio the real card uses (see
   * card-designs.ts's mediaAspect), so the crop the seller sees while
   * dragging matches reality at any width. */
  cardDesign?: string | null;
  /** Matches the width of the "Live preview" card beside this picker. */
  width?: number;
  /**
   * ID of an already-created product. When set, a "Save position" button
   * renders and writes `value` straight to the database via a dedicated
   * PATCH, so the real storefront card updates immediately — dragging alone
   * only ever updates the on-screen preview, never the database.
   * Omitted while adding a brand-new product (nothing to save to yet); the
   * position is included instead in that product's own creation payload.
   */
  productId?: string;
}

function parsePosition(value: string | null | undefined): { x: number; y: number } {
  const fallback = { x: 50, y: 50 };
  if (!value) return fallback;
  const m = value.match(/^(\d{1,3})%\s+(\d{1,3})%$/);
  if (!m) return fallback;
  return {
    x: Math.min(100, Math.max(0, parseInt(m[1], 10))),
    y: Math.min(100, Math.max(0, parseInt(m[2], 10))),
  };
}

/**
 * Lets a seller drag directly on their product photo to choose what stays
 * visible when the storefront card crops it (object-cover) to fill a fixed
 * box — center-cropping isn't always right (it can cut off a model's face
 * on a tall portrait shot). The box here uses the same `mediaAspect` ratio
 * the real card uses (see card-designs.ts), so the crop shown while
 * dragging matches what shoppers will actually see at any screen size.
 */
export function ImagePositionPicker({
  image,
  value,
  onChange,
  cardDesign,
  width = 176,
  productId,
}: ImagePositionPickerProps) {
  const design = resolveCardDesign(cardDesign);
  const boxRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const pos = parsePosition(value);

  const handleSave = async () => {
    if (!productId || saveState === "saving") return;
    setSaveState("saving");
    try {
      const token = auth.currentUser?.uid;
      const res = await fetch("/api/sellers/products/image-position", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ productId, position: value || "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setSaveState("saved");
      toast.success("Photo position saved — your storefront card is updated");
      // Keep the seller's own products list (which caches for 5 minutes,
      // see PROD_KEY in that page) from showing the old crop if they saved
      // here without also hitting the main form's Save Changes button.
      try { localStorage.removeItem("nxc-prods-v1"); } catch {}
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (err) {
      setSaveState("idle");
      toast.error(err instanceof Error ? err.message : "Failed to save photo position");
    }
  };

  const updateFromPoint = useCallback(
    (clientX: number, clientY: number) => {
      const el = boxRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.min(100, Math.max(0, Math.round(((clientX - rect.left) / rect.width) * 100)));
      const y = Math.min(100, Math.max(0, Math.round(((clientY - rect.top) / rect.height) * 100)));
      onChange(`${x}% ${y}%`);
    },
    [onChange]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    updateFromPoint(e.clientX, e.clientY);
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    updateFromPoint(e.clientX, e.clientY);
  };
  const stopDragging = () => setDragging(false);

  if (!image) return null;

  return (
    <div className="space-y-1.5" style={{ width }}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Photo position
        </p>
        {value && (
          <button
            type="button"
            onClick={() => onChange("50% 50%")}
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            <RotateCcw className="h-2.5 w-2.5" /> Reset
          </button>
        )}
      </div>
      <div
        ref={boxRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        className={cn(
          "relative overflow-hidden rounded-xl border border-gray-200 cursor-crosshair select-none touch-none",
          design.mediaAspect
        )}
        style={{ width, backgroundColor: "rgba(248,250,252,0.85)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- needs its own
            drag-driven objectPosition; next/image's fill mode is awkward to
            keep in sync with a live-dragged style on every pointer move. */}
        <img
          src={image}
          alt="Drag to choose what shows on the card"
          className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          style={{ objectPosition: `${pos.x}% ${pos.y}%` }}
          draggable={false}
        />
        {/* Focal-point handle */}
        <div
          className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-500/90 shadow-md pointer-events-none"
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
        />
      </div>
      <p className="text-[10px] leading-snug text-gray-400">
        Drag to choose what stays visible when the card crops this photo.
      </p>
      {productId && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saveState === "saving"}
          className={`flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[12px] font-medium transition-colors ${
            saveState === "saved"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-blue-600 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-70"
          }`}
        >
          {saveState === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {saveState === "saved" && <Check className="h-3.5 w-3.5" />}
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved to your store" : "Save position"}
        </button>
      )}
    </div>
  );
}
