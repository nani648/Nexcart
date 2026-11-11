import Link from "next/link";
import {
  Smartphone, Shirt, Home, BookOpen, Dumbbell, Sparkles,
  Gamepad2, Car, ShoppingBasket, Leaf, HeartPulse, PawPrint,
} from "lucide-react";

const CATEGORIES = [
  { name: "Electronics", slug: "electronics", Icon: Smartphone, grad: "linear-gradient(135deg, #3b82f6, #6366f1)", glow: "rgba(99,102,241,0.22)", light: "#eff6ff" },
  { name: "Fashion",     slug: "fashion",     Icon: Shirt,       grad: "linear-gradient(135deg, #ec4899, #f43f5e)", glow: "rgba(244,63,94,0.22)",  light: "#fff1f2" },
  { name: "Home",        slug: "home",        Icon: Home,        grad: "linear-gradient(135deg, #f59e0b, #f97316)", glow: "rgba(249,115,22,0.22)", light: "#fffbeb" },
  { name: "Books",       slug: "books",       Icon: BookOpen,    grad: "linear-gradient(135deg, #10b981, #059669)", glow: "rgba(16,185,129,0.22)", light: "#ecfdf5" },
  { name: "Sports",      slug: "sports",      Icon: Dumbbell,    grad: "linear-gradient(135deg, #ef4444, #dc2626)", glow: "rgba(239,68,68,0.22)",  light: "#fef2f2" },
  { name: "Beauty",      slug: "beauty",      Icon: Sparkles,    grad: "linear-gradient(135deg, #a855f7, #d946ef)", glow: "rgba(168,85,247,0.22)", light: "#faf5ff" },
  { name: "Toys",        slug: "toys",        Icon: Gamepad2,    grad: "linear-gradient(135deg, #06b6d4, #0ea5e9)", glow: "rgba(14,165,233,0.22)", light: "#f0f9ff" },
  { name: "Auto",        slug: "automotive",  Icon: Car,         grad: "linear-gradient(135deg, #64748b, #475569)", glow: "rgba(100,116,139,0.22)", light: "#f8fafc" },
  { name: "Grocery",     slug: "groceries",   Icon: ShoppingBasket, grad: "linear-gradient(135deg, #22c55e, #16a34a)", glow: "rgba(34,197,94,0.22)", light: "#f0fdf4" },
  { name: "Garden",      slug: "garden",      Icon: Leaf,        grad: "linear-gradient(135deg, #84cc16, #65a30d)", glow: "rgba(132,204,22,0.22)", light: "#f7fee7" },
  { name: "Health",      slug: "health",      Icon: HeartPulse,  grad: "linear-gradient(135deg, #f43f5e, #e11d48)", glow: "rgba(244,63,94,0.22)",  light: "#fff1f2" },
  { name: "Pets",        slug: "pets",        Icon: PawPrint,    grad: "linear-gradient(135deg, #fb923c, #f59e0b)", glow: "rgba(251,146,60,0.22)", light: "#fff7ed" },
];

export function CategoryIcons() {
  return (
    <section className="border-b border-border/40" style={{ background: "#f8fafc" }}>
      <div className="w-full px-4 py-5 md:py-7">
        <p className="mb-4 text-[11px] md:text-[15px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Shop by Category
        </p>
        <div
          className="flex gap-3 md:gap-2 overflow-x-auto md:overflow-hidden pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {CATEGORIES.map(({ name, slug, Icon, grad, glow, light }) => (
            <Link
              key={slug}
              href={`/categories/${slug}`}
              className="group flex shrink-0 md:flex-1 flex-col items-center gap-2.5 md:gap-4 rounded-2xl p-3.5 md:p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.97]"
              style={{
                minWidth: 76,
                background: "#ffffff",
                border: "1px solid rgba(0,0,0,0.06)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}
            >
              {/* Colored icon circle */}
              <div
                className="flex h-11 w-11 md:h-16 md:w-16 items-center justify-center rounded-xl md:rounded-2xl transition-transform duration-200 group-hover:scale-110"
                style={{ background: grad, boxShadow: `0 4px 12px ${glow}` }}
              >
                <Icon className="h-5 w-5 md:h-8 md:w-8 text-white" strokeWidth={1.75} />
              </div>

              {/* Label */}
              <span className="text-center text-[11px] md:text-[15px] font-semibold leading-tight text-slate-500 group-hover:text-slate-800 transition-colors whitespace-nowrap">
                {name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
