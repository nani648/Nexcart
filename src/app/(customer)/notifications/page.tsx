"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, Package, Star, Truck, CheckCircle, ShoppingBag, AlertCircle, ArrowLeft, Store } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  link: string | null;
  imageUrl: string | null;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function NotifIcon({ type }: { type: string }) {
  const cls = "h-5 w-5 shrink-0";
  if (type === "NEW_PRODUCT") return <Store className={cls} style={{ color: "#6d28d9" }} />;
  if (type === "STORE_FOLLOW") return <Star className={cls} style={{ color: "#f59e0b" }} />;
  if (type === "ORDER_PLACED") return <ShoppingBag className={cls} style={{ color: "#3b82f6" }} />;
  if (type === "ORDER_SHIPPED") return <Truck className={cls} style={{ color: "#0ea5e9" }} />;
  if (type === "ORDER_DELIVERED") return <CheckCircle className={cls} style={{ color: "#22c55e" }} />;
  if (type === "NEW_REVIEW") return <Star className={cls} style={{ color: "#f59e0b" }} />;
  if (type === "LOW_STOCK") return <AlertCircle className={cls} style={{ color: "#ef4444" }} />;
  if (type === "SELLER_APPROVED") return <CheckCircle className={cls} style={{ color: "#22c55e" }} />;
  return <Bell className={cls} style={{ color: "#64748b" }} />;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setAuthed(!!u);
      if (!u) router.push("/sign-in");
    });
    return unsub;
  }, [router]);

  const fetch_ = useCallback(async () => {
    try {
      const uid = auth.currentUser?.uid ?? (() => { try { return localStorage.getItem("nxc-uid"); } catch { return null; } })();
      const res = await fetch("/api/notifications", {
        headers: uid ? { Authorization: `Bearer ${uid}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid ?? (() => { try { return localStorage.getItem("nxc-uid"); } catch { return null; } })();
    if (authed || uid) fetch_();
  }, [authed, fetch_]);

  // Mark all read on mount
  useEffect(() => {
    if (!authed) return;
    setTimeout(() => {
      const uid = auth.currentUser?.uid ?? (() => { try { return localStorage.getItem("nxc-uid"); } catch { return null; } })();
      fetch("/api/notifications", {
        method: "PATCH",
        headers: uid ? { Authorization: `Bearer ${uid}` } : {},
      }).catch(() => {});
    }, 1000);
  }, [authed]);

  if (authed === null || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-[20px] font-bold">Notifications</h1>
            <p className="text-[13px] text-muted-foreground">{notifications.length} total</p>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Bell className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="font-bold text-[18px] text-foreground/60">No notifications yet</p>
            <p className="text-[14px] text-muted-foreground mt-1 max-w-xs">
              Follow stores to get notified when they add new products!
            </p>
            <Link
              href="/search"
              className="mt-5 rounded-xl px-5 py-2.5 text-[14px] font-bold text-white"
              style={{ background: "linear-gradient(135deg, #3b82f6, #6d28d9)" }}
            >
              Discover Stores
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
            {notifications.map((n, i) => {
              const inner = (
                <div
                  className={`flex items-start gap-4 px-4 py-4 ${i < notifications.length - 1 ? "border-b border-border/40" : ""} ${!n.isRead ? "bg-primary/[0.03]" : ""} hover:bg-muted/40 transition-colors cursor-pointer`}
                >
                  <div className="shrink-0 mt-0.5">
                    {n.imageUrl ? (
                      <div className="h-12 w-12 rounded-xl overflow-hidden border border-border/40">
                        <Image src={n.imageUrl} alt="" width={48} height={48} className="object-cover w-full h-full" />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                        <NotifIcon type={n.type} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-[14px] font-semibold ${!n.isRead ? "text-foreground" : "text-foreground/75"}`}>
                        {n.title}
                      </p>
                      {!n.isRead && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                    </div>
                    <p className="text-[13px] text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
                    <p className="text-[12px] text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              );
              return n.link ? (
                <Link key={n.id} href={n.link}>{inner}</Link>
              ) : (
                <div key={n.id}>{inner}</div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
