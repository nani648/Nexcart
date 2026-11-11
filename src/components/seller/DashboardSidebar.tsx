"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Settings,
  BarChart2,
  ChevronRight,
  Store,
  Clock,
  Tag,
  RotateCcw,
  IndianRupee,
  Menu,
  X,
  Sparkles,
  Layers,
  QrCode,
  Zap,
  GalleryHorizontal,
  Palette,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useState, type ComponentType } from "react";
import { storeUrlFor } from "@/lib/store-url";

interface DashboardSidebarProps {
  seller: {
    sellerId: string;
    storeName: string;
    status: string;
    storeHandle?: string | null;
  };
}

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
  /** Resolved from `seller.sellerId` at render time instead of being a fixed path — see NAV_ITEMS below. */
  dynamic?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  // Href is a placeholder — the real destination (the seller's own live
  // storefront, e.g. "/store/KRISHN001") depends on sellerId, which isn't
  // known until the component has its props. Resolved per-item in the
  // render loop below instead of hardcoded here, same as every other entry.
  { href: "/store", label: "My Store", icon: Store, dynamic: true },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/design", label: "Edit design", icon: Palette },
  { href: "/dashboard/scrolling-design", label: "Scrolling Design", icon: Wand2 },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag },
  { href: "/dashboard/returns", label: "Returns", icon: RotateCcw },
  { href: "/dashboard/payouts", label: "Payouts", icon: IndianRupee },
  { href: "/dashboard/offers", label: "Offers", icon: Tag },
  { href: "/dashboard/highlights", label: "Highlights", icon: Sparkles },
  { href: "/dashboard/collections", label: "Collections", icon: Layers },
  { href: "/dashboard/flash-sale", label: "Flash Sale", icon: Zap },
  { href: "/dashboard/gallery", label: "Gallery", icon: GalleryHorizontal },
  { href: "/dashboard/qr-code", label: "QR Code", icon: QrCode },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardSidebar({ seller }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const initials = seller.storeName?.slice(0, 2).toUpperCase() || "ST";
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleHover = useCallback((href: string) => {
    router.prefetch(href);
  }, [router]);

  const SidebarContent = () => (
    <>
      {/* Profile section */}
      <div className="border-b border-border/40 px-4 py-5">
        <div className="mb-3 flex h-10 w-10 lg:h-12 lg:w-12 items-center justify-center rounded-full bg-foreground text-[13px] lg:text-[15px] font-semibold text-background">
          {initials}
        </div>
        <div className="text-[13px] lg:text-[16px] font-semibold text-foreground leading-tight">{seller.storeName}</div>
        <div className="mt-0.5 text-[11px] lg:text-[13px] text-muted-foreground">{seller.sellerId}</div>
        {seller.status !== "APPROVED" && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400">
            <Clock className="h-3 w-3" />
            Account under review
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          // "My Store" points at the seller's own live storefront rather
          // than a page inside the dashboard — its real href only exists
          // once we have sellerId, so it's resolved here instead of being
          // part of the static list above.
          const href = item.dynamic ? storeUrlFor(seller) : item.href;
          // Structurally can never match while this sidebar is mounted (its
          // route lives entirely outside /dashboard), so there's no need to
          // special-case it away from false — but skip the pathname check
          // for a dynamic item regardless, since it isn't a dashboard path.
          const active = item.dynamic
            ? false
            : item.exact
              ? pathname === href
              : pathname.startsWith(href);
          const itemClassName = cn(
            "group flex items-center gap-2.5 lg:gap-3.5 rounded-[10px] px-3 lg:px-4 py-2 lg:py-3 text-[13px] lg:text-[15px] font-medium transition-all duration-150",
            active
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          );
          const content = (
            <>
              <item.icon className="h-4 w-4 lg:h-5 lg:w-5 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {active && (
                <ChevronRight className="h-3.5 w-3.5 lg:h-4 lg:w-4 opacity-50" />
              )}
            </>
          );

          // "My Store" deliberately uses a plain <a>, not next/link's <Link>.
          // Link would do a client-side SPA transition, which can serve an
          // already-cached (stale) render of the storefront route from
          // Next's client Router Cache — e.g. right after saving a new
          // banner/card colour in Settings, clicking through would still
          // show the OLD colour until something forced a hard reload. A
          // plain anchor always does a full navigation, which always asks
          // the server fresh, so it's guaranteed to reflect whatever was
          // just saved.
          if (item.dynamic) {
            return (
              <a key={item.href} href={href} onClick={() => setDrawerOpen(false)} className={itemClassName}>
                {content}
              </a>
            );
          }

          return (
            <Link
              key={item.href}
              href={href}
              prefetch={true}
              onMouseEnter={() => handleHover(href)}
              onFocus={() => handleHover(href)}
              onClick={() => setDrawerOpen(false)}
              className={itemClassName}
            >
              {content}
            </Link>
          );
        })}
      </nav>

    </>
  );

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="sticky top-0 hidden h-screen w-[240px] lg:w-[280px] shrink-0 flex-col border-r border-border/40 bg-background md:flex">
        <SidebarContent />
      </aside>

      {/* ── Mobile top bar ──────────────────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center gap-3 border-b border-border/50 bg-background/90 backdrop-blur-xl px-4 md:hidden">
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground shrink-0">
          <Store className="h-3.5 w-3.5 text-background" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="truncate text-sm font-semibold">{seller.storeName}</div>
        </div>
      </div>

      {/* ── Mobile drawer ───────────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer panel */}
          <div className="absolute top-0 left-0 bottom-0 flex w-[260px] flex-col bg-background">
            {/* Drawer header */}
            <div className="flex items-center justify-between border-b border-border/40 px-4 py-4">
              <div className="text-[13px] font-semibold">Menu</div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
