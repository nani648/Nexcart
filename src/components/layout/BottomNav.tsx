"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Grid3x3, Search, Heart, User2, X, Smartphone, Shirt, BookOpen, Dumbbell, Sparkles, Gamepad2, Car, ShoppingBasket, Leaf, HeartPulse, PawPrint } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCartStore, useUIStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { name: "Electronics", slug: "electronics", Icon: Smartphone },
  { name: "Fashion",     slug: "fashion",     Icon: Shirt },
  { name: "Home",        slug: "home",        Icon: Home },
  { name: "Books",       slug: "books",       Icon: BookOpen },
  { name: "Sports",      slug: "sports",      Icon: Dumbbell },
  { name: "Beauty",      slug: "beauty",      Icon: Sparkles },
  { name: "Toys",        slug: "toys",        Icon: Gamepad2 },
  { name: "Auto",        slug: "automotive",  Icon: Car },
  { name: "Grocery",     slug: "groceries",   Icon: ShoppingBasket },
  { name: "Garden",      slug: "garden",      Icon: Leaf },
  { name: "Health",      slug: "health",      Icon: HeartPulse },
  { name: "Pets",        slug: "pets",        Icon: PawPrint },
];

function getActiveTab(pathname: string): string {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/search") || pathname.startsWith("/categories")) return "categories";
  if (pathname.startsWith("/wishlist")) return "wishlist";
  if (pathname.startsWith("/account") || pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")) return "account";
  return "";
}

interface TabProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  badge?: number;
  onClick: () => void;
}

function Tab({ id, label, icon, isActive, badge, onClick }: TabProps) {
  return (
    <button
      onClick={onClick}
      className="nxc-ripple relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-colors"
      aria-label={label}
    >
      {/* Liquid blob indicator */}
      <span
        className={cn(
          "mb-0.5 rounded-full transition-all",
          isActive
            ? "h-1 w-8 bg-primary opacity-100 shadow-[0_0_8px_2px] shadow-primary/50"
            : "h-0.5 w-0 bg-primary opacity-0"
        )}
        style={{ transition: "width 0.4s cubic-bezier(0.34,1.56,0.64,1), height 0.3s ease, opacity 0.2s ease, box-shadow 0.3s ease" }}
      />

      {/* Icon + badge */}
      <span className="relative">
        <span className={cn("block transition-colors", isActive ? "text-primary" : "text-muted-foreground")}>
          {icon}
        </span>
        {badge != null && badge > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>

      {/* Label */}
      <span className={cn("text-[10px] font-medium leading-none transition-colors", isActive ? "text-primary" : "text-muted-foreground")}>
        {label}
      </span>
    </button>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const activeTab = getActiveTab(pathname);
  const _totalItems = useCartStore((s) => s.getTotalItems());
  const { setSearchOpen } = useUIStore();
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const totalItems = mounted ? _totalItems : 0;

  // Seller dashboard has its own bottom nav — hide the customer one there
  if (pathname.startsWith("/dashboard")) return null;

  const tabs = [
    {
      id: "home",
      label: "Home",
      icon: <Home size={22} strokeWidth={activeTab === "home" ? 2.2 : 1.8} />,
      onClick: () => router.push("/"),
    },
    {
      id: "categories",
      label: "Categories",
      icon: <Grid3x3 size={22} strokeWidth={activeTab === "categories" ? 2.2 : 1.8} />,
      onClick: () => setCategorySheetOpen(true),
    },
    {
      id: "search",
      label: "Search",
      icon: <Search size={22} strokeWidth={1.8} />,
      onClick: () => {
        setSearchOpen(true);
      },
    },
    {
      id: "wishlist",
      label: "Wishlist",
      icon: <Heart size={22} strokeWidth={activeTab === "wishlist" ? 2.2 : 1.8} fill={activeTab === "wishlist" ? "currentColor" : "none"} />,
      onClick: () => router.push("/wishlist"),
    },
    {
      id: "account",
      label: "Account",
      icon: <User2 size={22} strokeWidth={activeTab === "account" ? 2.2 : 1.8} />,
      onClick: () => router.push("/account"),
    },
  ];

  return (
    <>
      {/* Bottom Nav Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex h-14 items-stretch border-t border-border/60 bg-background/90 backdrop-blur-xl">
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              id={tab.id}
              label={tab.label}
              icon={tab.icon}
              isActive={activeTab === tab.id}
              badge={tab.id === "wishlist" || tab.id === "account" ? undefined : tab.id === "home" && totalItems > 0 ? totalItems : undefined}
              onClick={tab.onClick}
            />
          ))}
        </div>
      </nav>

      {/* Category Bottom Sheet */}
      <AnimatePresence>
        {categorySheetOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] bg-black/50 md:hidden"
              onClick={() => setCategorySheetOpen(false)}
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl bg-background md:hidden"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-3 pt-1">
                <h2 className="text-[13px] font-semibold text-foreground">
                  Shop by Category
                </h2>
                <button
                  onClick={() => setCategorySheetOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Category grid */}
              <div className="grid grid-cols-3 gap-2.5 px-4 pb-6 xs:grid-cols-4">
                {CATEGORIES.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/categories/${cat.slug}`}
                    onClick={() => setCategorySheetOpen(false)}
                    className="group flex min-h-[72px] flex-col items-center justify-center gap-2 rounded-[10px] border border-border/50 bg-[hsl(214_32%_98%)] dark:bg-[hsl(220_17%_10%)] px-2 py-3 active:bg-muted/60 transition-colors tap-target"
                  >
                    <cat.Icon className="h-5 w-5 text-muted-foreground/60 group-active:text-primary transition-colors" strokeWidth={1.75} />
                    <span className="text-center text-[10px] font-medium text-muted-foreground leading-tight">
                      {cat.name}
                    </span>
                  </Link>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
