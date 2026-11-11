"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  ChevronRight,
  ChevronLeft,
  Tag,
  Truck,
  Wallet,
  Percent,
  CreditCard,
  Gift,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OfferItem {
  id?: string;
  title: string;
  description?: string | null;
  offerType: string;
  discountVal?: number | null;
  buyQty?: number | null;
  getQty?: number | null;
}

interface OffersCarouselProps {
  offers?: OfferItem[];
}

// ─── Icon map ─────────────────────────────────────────────────────────────────

function iconForType(offerType: string) {
  switch (offerType) {
    case "FREE_SHIPPING":     return Truck;
    case "PERCENT_OFF":       return Percent;
    case "FLAT_OFF":          return Wallet;
    case "BUY_X_GET_Y":       return Gift;
    case "DEALS_OF_THE_DAY":  return Zap;
    default:                  return CreditCard;
  }
}

const MIN_CARD_WIDTH = 140;

// ─── Component ────────────────────────────────────────────────────────────────

export function OffersCarousel({ offers }: OffersCarouselProps) {
  const data: OfferItem[] = offers ?? [];

  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(2);
  const [start, setStart] = useState(0);

  const recalc = useCallback(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.offsetWidth;
    const available = width - 36;
    const count = Math.max(1, Math.floor(available / MIN_CARD_WIDTH));
    const capped = Math.min(count, data.length);
    setVisible(capped);
    setStart((s) => Math.min(s, Math.max(0, data.length - capped)));
  }, [data.length]);

  useEffect(() => {
    recalc();
    const ro = new ResizeObserver(recalc);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [recalc]);

  const canPrev = start > 0;
  const canNext = start + visible < data.length;

  const prev = () => setStart((s) => Math.max(0, s - 1));
  const next = () => setStart((s) => Math.min(data.length - visible, s + 1));

  if (data.length === 0) return null;

  const shown = data.slice(start, start + visible);

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden" ref={containerRef}>
      {/* Header */}
      <div className="bg-muted/30 px-3 py-2 text-[12px] font-bold text-foreground flex items-center gap-1.5 border-b border-border/30">
        <Tag className="h-3.5 w-3.5 text-primary" />
        Offers
        <span className="ml-auto text-[10px] font-normal text-muted-foreground">
          {data.length} offer{data.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Carousel row */}
      <div className="flex items-stretch">
        <div className="flex flex-1 divide-x divide-border/40 overflow-hidden min-w-0">
          {shown.map((offer, i) => {
            const Icon = iconForType(offer.offerType);
            const absIdx = start + i;
            return (
              <div
                key={(offer.id ?? offer.title) + i}
                className="flex-1 flex flex-col gap-1 px-3 py-3 min-w-0"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Icon className="h-3.5 w-3.5 text-foreground shrink-0" />
                  <span className="text-[12px] font-bold text-foreground truncate">
                    {offer.title}
                  </span>
                </div>
                {offer.description && (
                  <p className="text-[11.5px] text-muted-foreground leading-[1.4] line-clamp-3">
                    {offer.description}
                  </p>
                )}
                <button className="text-[11.5px] font-semibold text-primary hover:underline text-left mt-0.5 w-fit">
                  {absIdx + 1} offer ›
                </button>
              </div>
            );
          })}
        </div>

        {/* Right arrow */}
        <button
          onClick={next}
          disabled={!canNext}
          aria-label="Next offers"
          className={cn(
            "flex items-center justify-center w-9 shrink-0 border-l border-border/40 transition-colors",
            canNext
              ? "hover:bg-muted/40 text-foreground cursor-pointer"
              : "text-border/40 cursor-default"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Previous row */}
      {canPrev && (
        <div className="border-t border-border/30">
          <button
            onClick={prev}
            aria-label="Previous offers"
            className="flex items-center justify-center w-full py-1.5 text-[11px] font-semibold text-primary hover:bg-muted/30 transition-colors gap-1"
          >
            <ChevronLeft className="h-3 w-3" />
            Previous offers
          </button>
        </div>
      )}
    </div>
  );
}
