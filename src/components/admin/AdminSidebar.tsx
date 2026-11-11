"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingBag,
  CreditCard,
  Shield,
  ChevronRight,
  RotateCcw,
  IndianRupee,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/sellers", label: "Sellers", icon: Users },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/returns",  label: "Returns",  icon: RotateCcw },
  { href: "/admin/payouts", label: "Payouts", icon: IndianRupee },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-border/50 bg-background md:block">
      <div className="flex h-16 items-center gap-2 border-b border-border/50 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground">
          <Shield className="h-3.5 w-3.5 text-background" />
        </div>
        <div>
          <div className="text-sm font-semibold">Admin Panel</div>
          <div className="text-xs text-muted-foreground">NexCart</div>
        </div>
      </div>

      <nav className="mt-4 space-y-0.5 px-2">
        {NAV_ITEMS.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href) && pathname !== "/admin";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
              {active && <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-60" />}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
