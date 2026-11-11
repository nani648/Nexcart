"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Package, Star, Truck, AlertCircle, CheckCircle, ShoppingBag, ArrowRight, X, Store } from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import Image from "next/image";

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
  const cls = "h-4 w-4 shrink-0";
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

/**
 * Shared notifications store — module-level singleton.
 *
 * The desktop bell (NotificationBell) and the mobile bell
 * (NotificationBellMobile) are BOTH always mounted at the same time (one is
 * just hidden via responsive CSS depending on viewport width, not actually
 * unmounted). Each used to run its own onAuthStateChanged listener, its own
 * fetch on mount, and its own 30s setInterval poll — so every page load
 * fired two simultaneous /api/notifications requests (confirmed live via
 * the network tab: duplicate GET /api/notifications entries on every load),
 * doubling the DB + auth-verification work for zero benefit since both
 * requests return the same data.
 *
 * This singleton makes the fetch, the poll, and the Firebase auth
 * subscription happen exactly once no matter how many bell components are
 * mounted; both components just subscribe to the same in-memory state.
 */
function getUid(): string | null {
  return auth.currentUser?.uid ?? (() => {
    try { return localStorage.getItem("nxc-uid"); } catch { return null; }
  })();
}

let store = { authed: false, notifications: [] as Notification[], unread: 0 };
const listeners = new Set<() => void>();
let pollHandle: ReturnType<typeof setInterval> | null = null;
let authUnsub: (() => void) | null = null;
let refCount = 0;

function emit() {
  listeners.forEach((l) => l());
}

async function fetchNotifications() {
  if (!store.authed) return;
  try {
    const uid = getUid();
    if (!uid) return;
    const res = await fetch("/api/notifications", { headers: { Authorization: `Bearer ${uid}` } });
    if (!res.ok) return;
    const data = await res.json();
    store = { ...store, notifications: data.notifications ?? [], unread: data.unreadCount ?? 0 };
    emit();
  } catch {
    // silent
  }
}

async function markAllReadShared() {
  if (store.unread === 0) return;
  const prev = store;
  store = { ...store, unread: 0, notifications: store.notifications.map((n) => ({ ...n, isRead: true })) };
  emit();
  try {
    const uid = getUid();
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: uid ? { Authorization: `Bearer ${uid}` } : {},
    });
    if (!res.ok) throw new Error("Failed to mark notifications read");
  } catch {
    store = prev;
    emit();
  }
}

function useSharedNotifications() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    listeners.add(listener);
    refCount++;

    if (refCount === 1) {
      authUnsub = onAuthStateChanged(auth, (u) => {
        store = { ...store, authed: !!u, ...(u ? {} : { notifications: [], unread: 0 }) };
        emit();
        if (u) {
          fetchNotifications();
          if (!pollHandle) pollHandle = setInterval(fetchNotifications, 30000);
        } else if (pollHandle) {
          clearInterval(pollHandle);
          pollHandle = null;
        }
      });
    }

    return () => {
      listeners.delete(listener);
      refCount--;
      if (refCount === 0) {
        authUnsub?.();
        authUnsub = null;
        if (pollHandle) {
          clearInterval(pollHandle);
          pollHandle = null;
        }
      }
    };
  }, []);

  return store;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { authed, notifications, unread } = useSharedNotifications();
  const dropRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (!dropRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const handleOpen = () => {
    setOpen((v) => {
      const next = !v;
      if (next && unread > 0) {
        // defer mark-read so badge disappears after panel opens
        setTimeout(markAllReadShared, 1200);
      }
      return next;
    });
  };

  if (!authed) return null;

  return (
    <div className="relative" ref={dropRef}>
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative flex flex-col items-center justify-center rounded-xl px-2.5 py-2 hover:bg-white/10 transition-colors duration-150 group"
      >
        <div className="relative">
          <Bell className="h-[22px] w-[22px] text-white/80" />
          {unread > 0 && (
            <span
              className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-black text-white leading-none animate-pulse"
              style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>
        <span style={{ fontSize: 11 }} className="font-bold text-white/55 mt-[2px]">Alerts</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-[360px] max-h-[480px] rounded-2xl border border-border/60 bg-white dark:bg-[hsl(220_17%_10%)] shadow-2xl z-[60] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="font-bold text-[14px]">Notifications</span>
              {unread > 0 && (
                <span className="rounded-full bg-red-100 text-red-600 text-[11px] font-bold px-2 py-0.5">
                  {unread} new
                </span>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 hover:bg-muted transition-colors text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <Bell className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="font-semibold text-[14px] text-foreground/60">No notifications yet</p>
                <p className="text-[12px] text-muted-foreground mt-1">
                  Follow a store to get notified when they add new products!
                </p>
              </div>
            )}
            {notifications.map((n) => {
              const inner = (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-border/30 hover:bg-muted/50 transition-colors cursor-pointer ${!n.isRead ? "bg-primary/[0.04]" : ""}`}
                >
                  {/* Image or icon */}
                  <div className="shrink-0 mt-0.5">
                    {n.imageUrl ? (
                      <div className="h-10 w-10 rounded-xl overflow-hidden border border-border/40">
                        <Image src={n.imageUrl} alt="" width={40} height={40} className="object-cover w-full h-full" />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                        <NotifIcon type={n.type} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-[13px] font-semibold leading-snug ${!n.isRead ? "text-foreground" : "text-foreground/75"}`}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                      {n.body}
                    </p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              );

              return n.link ? (
                <Link key={n.id} href={n.link} onClick={() => setOpen(false)}>
                  {inner}
                </Link>
              ) : (
                <div key={n.id}>{inner}</div>
              );
            })}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border/40 px-4 py-2.5 flex items-center justify-between">
              <button
                onClick={markAllReadShared}
                className="text-[12px] text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                Mark all as read
              </button>
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1 text-[12px] text-primary font-semibold hover:underline"
              >
                See all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Mobile version — compact icon only (no label). Shares the same
// singleton store as NotificationBell, so this does NOT trigger its own
// fetch/poll/auth-listener — see useSharedNotifications above.
export function NotificationBellMobile() {
  const { authed, unread } = useSharedNotifications();

  if (!authed) return null;

  return (
    <Link
      href="/notifications"
      aria-label="Notifications"
      className="relative flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/10 text-white/70 transition-colors"
    >
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span
          className="absolute right-0.5 top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[10px] font-black text-white leading-none"
          style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
