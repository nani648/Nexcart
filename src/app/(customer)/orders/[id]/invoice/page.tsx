"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { formatPrice, formatDate } from "@/lib/utils";
import { ArrowLeft, Printer, Loader2, Package } from "lucide-react";
import { computeLineGst, isIntraState, splitGst } from "@/lib/gst";

interface InvoiceItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    productId: string;
    gstRate: number | null;
    hsnCode: string | null;
  };
  seller: {
    storeName: string;
    sellerId: string;
    storeAddress: string | null;
    gstin: string | null;
    state: string | null;
  };
}

interface OrderDetail {
  orderId: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: InvoiceItem[];
  address: { name: string; line1: string; line2: string | null; city: string; state: string; pincode: string } | null;
  payment: { method: string; status: string } | null;
}

export default function InvoicePage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/sign-in");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !orderId) return;
    fetch(`/api/orders/${orderId}`, { headers: { Authorization: `Bearer ${user.uid}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then(setOrder)
      .finally(() => setFetching(false));
  }, [user, orderId]);

  if (loading || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  if (!order) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-20 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <h2 className="mt-4 font-medium">Order not found</h2>
          <Link href="/orders" className="mt-4 inline-block text-sm underline underline-offset-4">
            Back to Orders
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  // Group items by seller — each seller is a separate "supplier" on the invoice
  const groups = new Map<string, { seller: InvoiceItem["seller"]; items: InvoiceItem[] }>();
  for (const item of order.items) {
    const key = item.seller.sellerId;
    if (!groups.has(key)) groups.set(key, { seller: item.seller, items: [] });
    groups.get(key)!.items.push(item);
  }

  return (
    <>
      <div className="print:hidden">
        <Navbar />
      </div>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 space-y-6 print:max-w-full print:px-0 print:py-0">
        <div className="flex items-center gap-3 print:hidden">
          <Link href={`/orders/${orderId}`} className="rounded-lg border border-border/50 p-2 hover:bg-muted/30">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Tax Invoice</h1>
            <p className="text-sm text-muted-foreground">Order #{order.orderId?.slice(-8).toUpperCase()}</p>
          </div>
          <button
            onClick={() => window.print()}
            className="ml-auto flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Printer className="h-4 w-4" /> Print / Save PDF
          </button>
        </div>

        {/* Header (visible in print too) */}
        <div className="hidden print:block mb-4">
          <h1 className="text-xl font-bold">Tax Invoice</h1>
          <p className="text-sm">Order #{order.orderId?.slice(-8).toUpperCase()} · {formatDate(new Date(order.createdAt))}</p>
        </div>

        {/* Bill to */}
        {order.address && (
          <div className="rounded-xl border border-border/50 p-4 space-y-1 print:border-gray-300">
            <h2 className="text-sm font-semibold">Bill To</h2>
            <p className="text-sm text-muted-foreground print:text-black">
              {order.address.name}<br />
              {order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ""}<br />
              {order.address.city}, {order.address.state} – {order.address.pincode}
            </p>
          </div>
        )}

        {/* One block per seller */}
        {Array.from(groups.values()).map(({ seller, items }) => {
          const sameState = isIntraState(seller.state, order.address?.state);

          let subtotal = 0;
          let totalGst = 0;
          let anyGst = false;

          const rows = items.map((item) => {
            const { taxable, gstAmount, hasGst } = computeLineGst(item.price, item.quantity, item.product.gstRate);
            subtotal += taxable;
            totalGst += gstAmount;
            if (hasGst) anyGst = true;
            return { item, taxable, gstAmount, hasGst };
          });

          const { cgst, sgst, igst } = splitGst(totalGst, sameState);
          const grandTotal = subtotal + totalGst;

          return (
            <div key={seller.sellerId} className="rounded-xl border border-border/50 p-4 space-y-4 print:border-gray-300 print:break-inside-avoid">
              {/* Seller details */}
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">{seller.storeName}</h2>
                  {seller.storeAddress && (
                    <p className="text-xs text-muted-foreground print:text-black">{seller.storeAddress}</p>
                  )}
                  {seller.gstin ? (
                    <p className="text-xs text-muted-foreground print:text-black">GSTIN: {seller.gstin}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground print:text-black">GSTIN not provided</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground print:text-black">
                  {sameState ? "Intra-state (CGST + SGST)" : "Inter-state (IGST)"}
                </span>
              </div>

              {/* Items table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-left text-muted-foreground print:text-black">
                      <th className="py-2 pr-2">Item</th>
                      <th className="py-2 pr-2">HSN</th>
                      <th className="py-2 pr-2 text-right">Qty</th>
                      <th className="py-2 pr-2 text-right">Taxable Value</th>
                      <th className="py-2 pr-2 text-right">GST</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ item, taxable, gstAmount, hasGst }) => (
                      <tr key={item.id} className="border-b border-border/30 last:border-0">
                        <td className="py-2 pr-2">{item.product.name}</td>
                        <td className="py-2 pr-2">{item.product.hsnCode || "—"}</td>
                        <td className="py-2 pr-2 text-right">{item.quantity}</td>
                        <td className="py-2 pr-2 text-right">{formatPrice(taxable)}</td>
                        <td className="py-2 pr-2 text-right">
                          {hasGst ? `${formatPrice(gstAmount)} (${item.product.gstRate}%)` : "—"}
                        </td>
                        <td className="py-2 text-right font-medium">{formatPrice(item.price * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-full max-w-xs space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground print:text-black">Taxable Value</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {anyGst ? (
                    sameState ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground print:text-black">CGST</span>
                          <span>{formatPrice(cgst)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground print:text-black">SGST</span>
                          <span>{formatPrice(sgst)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground print:text-black">IGST</span>
                        <span>{formatPrice(igst)}</span>
                      </div>
                    )
                  ) : (
                    <div className="flex justify-between text-xs text-muted-foreground print:text-black">
                      <span>GST breakup not available for this seller&apos;s items</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border/50 pt-1 font-semibold">
                    <span>Total</span>
                    <span>{formatPrice(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Order grand total */}
        <div className="rounded-xl border border-border/50 p-4 flex justify-between items-center print:border-gray-300">
          <span className="text-sm font-medium">Order Total</span>
          <span className="text-lg font-semibold">{formatPrice(order.totalAmount)}</span>
        </div>

        <p className="text-xs text-muted-foreground print:text-black">
          This is a computer-generated invoice. GST breakup is shown only for items where the seller has provided
          a GST rate; other items are treated as inclusive of all applicable taxes.
        </p>
      </main>
      <div className="print:hidden">
        <Footer />
      </div>
    </>
  );
}
