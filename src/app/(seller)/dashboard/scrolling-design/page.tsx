import type { Metadata } from "next";
import { ScrollingDesignSection } from "@/components/seller/ScrollingDesignSection";

export const metadata: Metadata = { title: "Scrolling Design" };

/**
 * Seller → Scrolling Design.
 *
 * Same authenticated-client-shell pattern as the "Edit design" page next to
 * it: the client component fetches/saves via /api/sellers/profile itself
 * (attaching a Firebase token per request), since there's no server session
 * to read here.
 */
export default function ScrollingDesignPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Scrolling Design</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Particles that react to how shoppers browse your store — moving the mouse on desktop, scrolling or
          touching the screen on mobile. Golden stars, confetti, snow and more. Off by default.
        </p>
      </div>

      <ScrollingDesignSection />
    </div>
  );
}
