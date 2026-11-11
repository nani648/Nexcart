"use client";

import { useAuthContext } from "@/context/AuthContext";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingCart, Heart, Search, Menu, Package, LayoutDashboard,
  X, Home, Tag,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore, useUIStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { SearchCommand } from "@/components/shared/SearchCommand";
import { Badge } from "@/components/ui/badge";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  // Role comes from AuthContext (backed by the DB), not the Firebase user
  // object — Firebase users have no `publicMetadata` (that was a Clerk API).
  const { user, isSeller } = useAuthContext();
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/search", label: "Products", icon: Package },
    { href: "/search?type=sellers", label: "Sellers", icon: Tag },
    ...(isSeller ? [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] : []),
  ];

  return (
    <>
      <button onClick={() => setOpen(true)} className="md:hidden p-2 text-muted-foreground">
        <Menu className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="fixed inset-y-0 right-0 z-50 w-72 bg-background p-6 shadow-2xl md:hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground">
                    <Package className="h-3.5 w-3.5 text-background" />
                  </div>
                  <span className="font-semibold">NexCart</span>
                </div>
                <button onClick={() => setOpen(false)} className="text-muted-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      pathname === item.href
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </nav>

              {user && (
                <div className="mt-6 border-t border-border/50 pt-6 space-y-1">
                  <Link href="/orders" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted">
                    <Package className="h-4 w-4" /> My Orders
                  </Link>
                  <Link href="/wishlist" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted">
                    <Heart className="h-4 w-4" /> Wishlist
                  </Link>
                </div>
              )}

              {!user && (
                <div className="mt-6 border-t border-border/50 pt-6 space-y-2">
                  <Link href="/sign-in" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full">Sign In</Button>
                  </Link>
                  <Link href="/sign-up" onClick={() => setOpen(false)}>
                    <Button className="w-full">Get Started</Button>
                  </Link>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
