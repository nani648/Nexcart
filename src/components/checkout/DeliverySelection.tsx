"use client";

import { useState, useEffect } from "react";
import { Truck, Zap, PackageCheck } from "lucide-react";

export interface DeliveryOption {
  id: string;
  name: string;
  description: string;
  deliveryDate: string;
  price: number;
  carrier: string;
}

function getDate(daysFromNow: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

// Static options with empty delivery dates — dates filled client-side after mount
const BASE_OPTIONS = [
  { id: "standard", name: "Standard Delivery", description: "Delivered by our trusted courier partners", days: 5, price: 0,   carrier: "Delhivery" },
  { id: "express",  name: "Express Delivery",  description: "Priority processing and faster dispatch",  days: 2, price: 99,  carrier: "BlueDart" },
  { id: "same_day", name: "Same Day Delivery", description: "Order before 12 PM for same-day delivery", days: 0, price: 199, carrier: "Blinkit Network" },
] as const;

const icons: Record<string, React.ReactNode> = {
  standard: <PackageCheck className="h-5 w-5" />,
  express: <Truck className="h-5 w-5" />,
  same_day: <Zap className="h-5 w-5" />,
};

interface Props {
  selected: string;
  onChange: (id: string) => void;
}

export function DeliverySelection({ selected, onChange }: Props) {
  const [dates, setDates] = useState<Record<string, string>>({});
  useEffect(() => {
    const d: Record<string, string> = {};
    BASE_OPTIONS.forEach(o => { d[o.id] = getDate(o.days); });
    setDates(d);
  }, []);

  const DELIVERY_OPTIONS: DeliveryOption[] = BASE_OPTIONS.map(o => ({
    id: o.id, name: o.name, description: o.description,
    deliveryDate: dates[o.id] ?? "—",
    price: o.price, carrier: o.carrier,
  }));

  return (
    <div className="space-y-3">
      {DELIVERY_OPTIONS.map(opt => {
        const isSelected = selected === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`w-full rounded-xl border p-4 text-left transition-all ${
              isSelected
                ? "border-primary bg-primary/5 dark:bg-primary/10 ring-1 ring-primary"
                : "border-border/50 bg-white dark:bg-[hsl(220_17%_10%)] hover:border-primary/40"
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Radio */}
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors" style={{ borderColor: isSelected ? "hsl(var(--primary))" : "hsl(var(--border))" }}>
                {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
              </div>

              {/* Icon + Content */}
              <div className="flex flex-1 items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 rounded-lg p-1.5 ${isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {icons[opt.id]}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold">{opt.name}</p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">{opt.description}</p>
                    <p className="mt-1 text-[13px] font-medium text-emerald-600">
                      Delivery by {opt.deliveryDate}
                    </p>
                  </div>
                </div>

                {/* Price */}
                <div className="shrink-0 text-right">
                  {opt.price === 0 ? (
                    <span className="text-[14px] font-bold text-emerald-600">FREE</span>
                  ) : (
                    <span className="text-[14px] font-bold">₹{opt.price}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Carrier pill */}
            <div className="mt-3 ml-9 pl-[52px]">
              <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {opt.carrier}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default DeliverySelection;
