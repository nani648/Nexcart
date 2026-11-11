"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";
import Link from "next/link";
import Image from "next/image";
import { formatDate, formatPrice, ORDER_STATUS_COLORS } from "@/lib/utils";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Loader2, Search, SlidersHorizontal, Package, Truck, Star, MapPin, Store } from "lucide-react";
import { OrderCardSkeleton } from "@/components/shared/Skeletons";

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: { name: string; images: string[]; productId: string };
  seller: { storeName: string };
}

interface Order {
  id: string;
  orderId: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  deliveryMethod: string | null;
  pickupCode: string | null;
  items: OrderItem[];
  address: { name: string; line1: string; city: string; pincode: string } | null;
}

const STATUS_OPTIONS = ["All", "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

const ACTIVE_STATUSES = new Set(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED"]);
const DELIVERED_STATUSES = new Set(["DELIVERED"]);

function ImageStack({ items }: { items: OrderItem[] }) {
  const imgs = items.slice(0, 3);
  return (
    <div className="flex items-center" style={{ width: imgs.length * 28 + 8 }}>
      {imgs.map((item, i) => (
        <div
          key={item.id}
          className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border-2 border-white dark:border-[hsl(220_17%_8%)] bg-muted shadow-sm"
          style={{ marginLeft: i === 0 ? 0 : -12, zIndex: imgs.length - i }}
        >
          <Image
            src={item.product.images[0] || "/placeholder.jpg"}
            alt={item.product.name}
            fill
            className="object-cover"
            sizes="40px"
          />
        </div>
      ))}
      {items.length > 3 && (
        <div
          className="relative h-10 w-10 shrink-0 flex items-center justify-center rounded-lg border-2 border-white dark:border-[hsl(220_17%_8%)] bg-muted text-[10px] font-bold text-muted-foreground shadow-sm"
          style={{ marginLeft: -12, zIndex: 0 }}
        >
          +{items.length - 3}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const isDelivered = DELIVERED_STATUSES.has(order.status);
  const isActive = ACTIVE_STATUSES.has(order.status);
  const isPickup = order.deliveryMethod === "PICKUP";

  return (
    <div className="rounded-[10px] border border-border/60 overflow-hidden bg-white dark:bg-card transition-all hover:border-border hover:shadow-[var(--shadow-xs)] fade-in-up">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-muted/30 px-5 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {/* Image thumbnails */}
          <ImageStack items={order.items} />
          <div>
            <p className="text-[12px] font-semibold text-foreground">#{order.orderId.slice(-8).toUpperCase()}</p>
            <p className="text-[11px] text-muted-foreground">{formatDate(new Date(order.createdAt))}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold">{formatPrice(order.totalAmount)}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS] ?? "bg-muted text-muted-foreground"}`}>
            {order.status}
          </span>
        </div>
      </div>

      {/* Items preview */}
      <div className="divide-y divide-border/40 px-5">
        {order.items.slice(0, 2).map((item) => (
          <div key={item.id} className="flex gap-3 py-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
              <Image src={item.product.images[0] || "/placeholder.jpg"} alt={item.product.name} fill className="object-cover" sizes="56px" />
            </div>
            <div className="flex flex-1 flex-col justify-center min-w-0">
              <Link href={`/product/${item.product.productId}`} className="text-[13px] font-medium hover:underline line-clamp-1">
                {item.product.name}
              </Link>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{item.seller.storeName} · Qty: {item.quantity}</p>
              <p className="mt-0.5 text-[12px] font-semibold">{formatPrice(item.price * item.quantity)}</p>
            </div>
          </div>
        ))}
        {order.items.length > 2 && (
          <p className="py-2 text-[12px] text-muted-foreground">+{order.items.length - 2} more item{order.items.length - 2 > 1 ? "s" : ""}</p>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 px-5 py-3 bg-muted/20">
        {isPickup ? (
          <p className="flex items-center gap-1 text-[11px] text-primary font-medium line-clamp-1 flex-1 min-w-0">
            <Store className="h-3 w-3 shrink-0" /> Pickup at store{order.pickupCode ? ` · ${order.pickupCode}` : ""}
          </p>
        ) : order.address ? (
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground line-clamp-1 flex-1 min-w-0">
            <MapPin className="h-3 w-3 shrink-0" /> {order.address.name}, {order.address.city}
          </p>
        ) : null}
        <div className="flex items-center gap-2 ml-auto">
          {isDelivered && !isPickup && (
            <Link
              href={`/product/${order.items[0]?.product.productId}`}
              className="btn-bounce inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-white dark:bg-card px-3 py-1.5 text-[12px] font-semibold text-foreground hover:bg-muted transition-colors min-h-[36px]"
            >
              <Star className="h-3.5 w-3.5 text-amber-500" />
              Rate
            </Link>
          )}
          {isPickup ? (
            <Link
              href={`/orders/${order.id}/pickup`}
              className="btn-bounce inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-semibold text-white hover:brightness-110 transition-all min-h-[36px]"
            >
              <Store className="h-3.5 w-3.5" />
              {isDelivered ? "View Pickup" : "View Pickup Code"}
            </Link>
          ) : (isActive || isDelivered) ? (
            <Link
              href={`/orders/${order.id}`}
              className="btn-bounce inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-semibold text-white hover:brightness-110 transition-all min-h-[36px]"
            >
              <Truck className="h-3.5 w-3.5" />
              {isDelivered ? "View Order" : "Track Order"}
            </Link>
          ) : (
            <Link
              href={`/orders/${order.id}`}
              className="btn-bounce inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-white dark:bg-card px-3 py-1.5 text-[12px] font-semibold text-foreground hover:bg-muted transition-colors min-h-[36px]"
            >
              View Details
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

const ORDERS_CACHE_KEY = "nxc-orders-v1";

export default function OrdersPage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();

  // Show the last-fetched orders instantly (stale-while-revalidate) so the
  // page never has to show a blank/spinner screen on repeat visits.
  const [orders, setOrders] = useState<Order[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(ORDERS_CACHE_KEY);
      return raw ? (JSON.parse(raw) as Order[]) : [];
    } catch {
      return [];
    }
  });
  const [fetching, setFetching] = useState(orders.length === 0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    if (!loading && !user) router.replace("/sign-in");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/orders", { headers: { Authorization: `Bearer ${user.uid}` } })
      .then((r) => r.json())
      .then((data) => {
        const list: Order[] = Array.isArray(data) ? data : data.orders ?? [];
        setOrders(list);
        try {
          localStorage.setItem(ORDERS_CACHE_KEY, JSON.stringify(list));
        } catch {
          // localStorage unavailable (private mode etc.) — non-fatal
        }
      })
      .finally(() => setFetching(false));
  }, [user]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch = search === "" || o.orderId.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "All" || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, search, statusFilter]);

  const activeOrders = filtered.filter((o) => ACTIVE_STATUSES.has(o.status));
  const deliveredOrders = filtered.filter((o) => DELIVERED_STATUSES.has(o.status));
  const otherOrders = filtered.filter((o) => !ACTIVE_STATUSES.has(o.status) && !DELIVERED_STATUSES.has(o.status));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* Page header */}
        <div className="mb-6 flex items-center gap-3 fade-in-up">
          <Package className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">My Orders</h1>
          {orders.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[12px] font-bold text-primary">
              {orders.length}
            </span>
          )}
        </div>

        {/* Search + filter bar */}
        {orders.length > 0 && (
          <div className="mb-6 flex flex-col gap-3 sm:flex-row fade-in-up stagger-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by Order ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-input bg-white dark:bg-card pl-9 pr-4 py-2.5 text-[13px] placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow min-h-[44px]"
              />
            </div>
            <div className="relative">
              <SlidersHorizontal className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none rounded-xl border border-input bg-white dark:bg-card pl-9 pr-8 py-2.5 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow cursor-pointer min-h-[44px] min-w-[160px]"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {fetching ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => <OrderCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 && orders.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-20 text-center fade-in-up">
            <Package className="h-12 w-12 text-muted-foreground/20" />
            <div>
              <h3 className="text-lg font-semibold">No orders yet</h3>
              <p className="mt-1 text-[14px] text-muted-foreground">Your orders will appear here once you start shopping</p>
            </div>
            <Link
              href="/search"
              className="btn-bounce inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-[14px] font-bold text-white hover:brightness-110 transition-all min-h-[44px]"
            >
              Start Shopping
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center fade-in-up">
            <Search className="h-10 w-10 text-muted-foreground/30" />
            <p className="font-medium">No orders match your filters</p>
            <button
              onClick={() => { setSearch(""); setStatusFilter("All"); }}
              className="text-[13px] font-semibold text-primary underline underline-offset-4"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Orders */}
            {activeOrders.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <h2 className="text-[15px] font-semibold uppercase tracking-wide text-primary">Active Orders</h2>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">{activeOrders.length}</span>
                </div>
                <div className="space-y-4">
                  {activeOrders.map((order, i) => (
                    <div key={order.id} className={["stagger-1","stagger-2","stagger-3","stagger-4"][Math.min(i, 3)]}>
                      <OrderCard order={order} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Delivered Orders */}
            {deliveredOrders.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  <h2 className="text-[15px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Delivered</h2>
                  <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">{deliveredOrders.length}</span>
                </div>
                <div className="space-y-4">
                  {deliveredOrders.map((order, i) => (
                    <div key={order.id} className={["stagger-1","stagger-2","stagger-3","stagger-4"][Math.min(i, 3)]}>
                      <OrderCard order={order} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Other Orders (cancelled, etc.) */}
            {otherOrders.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40" />
                  <h2 className="text-[15px] font-semibold uppercase tracking-wide text-muted-foreground">Other Orders</h2>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">{otherOrders.length}</span>
                </div>
                <div className="space-y-4">
                  {otherOrders.map((order, i) => (
                    <div key={order.id} className={["stagger-1","stagger-2","stagger-3","stagger-4"][Math.min(i, 3)]}>
                      <OrderCard order={order} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
