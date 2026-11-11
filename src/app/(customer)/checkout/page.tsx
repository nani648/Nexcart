"use client";

import { useAuthContext } from "@/context/AuthContext";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useCartStore } from "@/lib/store";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, MapPin, Clock, ShoppingBag, AlertCircle, Banknote, CreditCard, CheckCircle, Truck } from "lucide-react";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open: () => void };
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  prefill: { name?: string; email?: string };
  theme: { color: string };
  notes?: Record<string, string>;
  modal?: { ondismiss?: () => void };
}

interface Address {
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
}

interface LocalSellerInfo {
  sellerId: string;
  storeName: string;
  isLocalStore: boolean;
  storeAddress: string | null;
  pickupHours: string | null;
  pickupAcceptsCOD: boolean;
}

export default function CheckoutPage() {
  const { user, loading: authLoading } = useAuthContext();
  const router = useRouter();

  const { items, getTotalPrice, clearCart } = useCartStore();

  // Every checkout API call (address, order, payment) is authenticated
  // server-side via getVerifiedUid(), which only reads the Authorization
  // header. Without it these calls all return 401 and checkout can't finish.
  const authJsonHeaders = async (): Promise<Record<string, string>> => {
    if (!user) throw new Error("Please sign in to continue");
    const token = await user.getIdToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    if (!authLoading && !user) router.replace("/sign-in");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (items.length === 0) {
      router.replace("/cart");
    }
  }, [items.length, router]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [address, setAddress] = useState<Address>({
    name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
  });

  // Pickup mode state
  const [localSellerInfo, setLocalSellerInfo] = useState<LocalSellerInfo | null>(null);
  const [cartMode, setCartMode] = useState<"loading" | "pickup" | "delivery" | "mixed">("loading");
  const [pickupPaymentMethod, setPickupPaymentMethod] = useState<"cod" | "online" | null>(null);

  // Delivery payment method (COD only for orders ≤ ₹2,000)
  const COD_LIMIT = 2000;
  const [deliveryPaymentMethod, setDeliveryPaymentMethod] = useState<"online" | "cod">("online");

  const total = getTotalPrice();

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  // Detect local store items in cart
  useEffect(() => {
    if (items.length === 0) { setCartMode("delivery"); return; }

    const uniqueSellerIds = [...new Set(items.map((i) => i.sellerId))];
    fetch(`/api/sellers/check-local?sellerIds=${uniqueSellerIds.join(",")}`)
      .then((r) => r.json())
      .then((data: { sellers: LocalSellerInfo[] }) => {
        const sellers = data.sellers ?? [];
        const localSellers = sellers.filter((s) => s.isLocalStore);

        if (localSellers.length === 0) {
          setCartMode("delivery");
        } else if (localSellers.length === 1 && uniqueSellerIds.length === 1) {
          setLocalSellerInfo(localSellers[0]);
          setCartMode("pickup");
        } else {
          setCartMode("mixed");
        }
      })
      .catch(() => setCartMode("delivery"));
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  const handlePickupCheckout = async () => {
    const payMethod = localSellerInfo?.pickupAcceptsCOD ? pickupPaymentMethod : "online";
    if (!payMethod) {
      toast.error("Please select a payment method");
      return;
    }

    setIsProcessing(true);
    try {
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: await authJsonHeaders(),
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
          isPickup: true,
          pickupPayment: payMethod === "cod" ? "COD" : "ONLINE",
          couponCode: coupon || undefined,
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error);

      if (payMethod === "cod") {
        clearCart();
        toast.success("Order placed! Show your pickup code at the store and pay cash.");
        router.push("/orders");
        return;
      }

      // Online payment via Razorpay
      const payRes = await fetch("/api/payments", {
        method: "POST",
        headers: await authJsonHeaders(),
        body: JSON.stringify({ orderId: orderData.id, amount: orderData.totalAmount }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) throw new Error(payData.error);

      const rzp = new window.Razorpay({
        key: payData.keyId,
        amount: payData.amount,
        currency: payData.currency,
        name: "NexCart",
        description: "Pickup Order Payment",
        order_id: payData.id,
        handler: async (response) => {
          const verRes = await fetch("/api/payments", {
            method: "PUT",
            headers: await authJsonHeaders(),
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              paymentId: payData.paymentId,
            }),
          });
          if (verRes.ok) {
            clearCart();
            toast.success("Payment successful! Show your pickup code at the store.");
            router.push("/orders");
          } else {
            toast.error("Payment verification failed");
          }
        },
        prefill: { name: user?.displayName || "", email: user?.email ?? undefined },
        theme: { color: "#000000" },
        modal: { ondismiss: () => setIsProcessing(false) },
      });
      rzp.open();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to place order");
      setIsProcessing(false);
    }
  };

  const handleCheckout = async () => {
    if (!address.name || !address.phone || !address.line1 || !address.city || !address.state || !address.pincode) {
      toast.error("Please fill in all required address fields");
      return;
    }

    setIsProcessing(true);
    try {
      // Save address
      const addrRes = await fetch("/api/addresses", {
        method: "POST",
        headers: await authJsonHeaders(),
        body: JSON.stringify(address),
      });
      const addrData = await addrRes.json();
      if (!addrRes.ok) throw new Error(addrData.error);

      // Create order
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: await authJsonHeaders(),
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
          addressId: addrData.id,
          couponCode: coupon || undefined,
          isCOD: deliveryPaymentMethod === "cod",
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error);

      // COD — no payment needed, order is placed directly
      if (deliveryPaymentMethod === "cod") {
        clearCart();
        toast.success("Order placed! Pay cash when your order is delivered.");
        router.push("/orders");
        return;
      }

      // Online — open Razorpay
      const payRes = await fetch("/api/payments", {
        method: "POST",
        headers: await authJsonHeaders(),
        body: JSON.stringify({ orderId: orderData.id, amount: orderData.totalAmount }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) throw new Error(payData.error);

      const rzp = new window.Razorpay({
        key: payData.keyId,
        amount: payData.amount,
        currency: payData.currency,
        name: "NexCart",
        description: "Order Payment",
        order_id: payData.id,
        handler: async (response) => {
          const verRes = await fetch("/api/payments", {
            method: "PUT",
            headers: await authJsonHeaders(),
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              paymentId: payData.paymentId,
            }),
          });
          if (verRes.ok) {
            clearCart();
            toast.success("Payment successful! Order placed.");
            router.push("/orders");
          } else {
            toast.error("Payment verification failed");
          }
        },
        prefill: {
          name: user?.displayName || address.name,
          email: user?.email ?? undefined,
        },
        theme: { color: "#000000" },
      });
      rzp.open();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-3 py-5 sm:px-6 sm:py-10">
        <h1 className="mb-5 sm:mb-8 text-xl sm:text-2xl font-semibold">Checkout</h1>

        {/* Mixed cart warning */}
        {cartMode === "mixed" && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Mixed cart detected</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                Your cart has items from both local pickup stores and regular delivery sellers. Please keep only one type of seller&apos;s items in your cart to proceed.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3 lg:gap-8">

          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Pickup mode */}
            {cartMode === "pickup" && localSellerInfo && (
              <div className="space-y-4">
                {/* Store info card */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                      <Store className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{localSellerInfo.storeName}</p>
                      <p className="text-xs text-muted-foreground">Local Pickup Store</p>
                    </div>
                  </div>

                  {localSellerInfo.storeAddress && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-muted-foreground">{localSellerInfo.storeAddress}</p>
                    </div>
                  )}

                  {localSellerInfo.pickupHours && (
                    <div className="flex items-start gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-muted-foreground">{localSellerInfo.pickupHours}</p>
                    </div>
                  )}

                  <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3">
                    <p className="text-xs text-primary font-medium">
                      {localSellerInfo.pickupAcceptsCOD
                        ? "You will receive a pickup code after placing the order. Show it at the store to collect your items."
                        : "You will receive a pickup code after paying online. Show it at the store to collect your items."}
                    </p>
                  </div>
                </div>

                {/* Payment method choice */}
                {localSellerInfo.pickupAcceptsCOD ? (
                  <div className="rounded-xl border border-border/50 p-5 space-y-3">
                    <h2 className="font-semibold text-sm">Payment Method</h2>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPickupPaymentMethod("cod")}
                        className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition-all ${
                          pickupPaymentMethod === "cod"
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border/50 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Banknote className="h-5 w-5" />
                          {pickupPaymentMethod === "cod" && <CheckCircle className="h-4 w-4" />}
                        </div>
                        <span>Cash on Delivery</span>
                        <span className="text-xs text-muted-foreground font-normal">Pay at store</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPickupPaymentMethod("online")}
                        className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition-all ${
                          pickupPaymentMethod === "online"
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border/50 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-5 w-5" />
                          {pickupPaymentMethod === "online" && <CheckCircle className="h-4 w-4" />}
                        </div>
                        <span>Pay Online</span>
                        <span className="text-xs text-muted-foreground font-normal">Razorpay</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/50 p-4 flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Online Payment Only</p>
                      <p className="text-xs text-muted-foreground">This store accepts online payments only. Pay now via Razorpay.</p>
                    </div>
                  </div>
                )}

                {/* Coupon for pickup too */}
                <div className="rounded-xl border border-border/50 p-5">
                  <h2 className="mb-4 font-semibold">Coupon Code</h2>
                  <div className="flex gap-2">
                    <Input
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      className="uppercase"
                    />
                    <Button variant="outline" type="button">Apply</Button>
                  </div>
                </div>
              </div>
            )}

            {/* Normal delivery mode */}
            {(cartMode === "delivery" || cartMode === "loading") && (
              <>
                <div className="rounded-xl border border-border/50 p-5">
                  <h2 className="mb-4 font-semibold">Delivery Address</h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={address.name}
                        onChange={(e) => setAddress({ ...address, name: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        value={address.phone}
                        onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                        placeholder="9876543210"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label htmlFor="line1">Address Line 1 *</Label>
                      <Input
                        id="line1"
                        value={address.line1}
                        onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                        placeholder="House No, Street, Area"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label htmlFor="line2">Address Line 2</Label>
                      <Input
                        id="line2"
                        value={address.line2}
                        onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                        placeholder="Landmark (optional)"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={address.city}
                        onChange={(e) => setAddress({ ...address, city: e.target.value })}
                        placeholder="Chennai"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        value={address.state}
                        onChange={(e) => setAddress({ ...address, state: e.target.value })}
                        placeholder="Tamil Nadu"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="pincode">Pincode *</Label>
                      <Input
                        id="pincode"
                        value={address.pincode}
                        onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                        placeholder="600001"
                        maxLength={6}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border/50 p-5">
                  <h2 className="mb-4 font-semibold">Coupon Code</h2>
                  <div className="flex gap-2">
                    <Input
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      className="uppercase"
                    />
                    <Button variant="outline" type="button">Apply</Button>
                  </div>
                </div>

                {/* Delivery payment method */}
                <div className="rounded-xl border border-border/50 p-5 space-y-3">
                  <h2 className="font-semibold">Payment Method</h2>
                  {total <= COD_LIMIT ? (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setDeliveryPaymentMethod("online")}
                        className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition-all ${
                          deliveryPaymentMethod === "online"
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border/50 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-5 w-5" />
                          {deliveryPaymentMethod === "online" && <CheckCircle className="h-4 w-4" />}
                        </div>
                        <span>Pay Online</span>
                        <span className="text-xs text-muted-foreground font-normal">Razorpay</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryPaymentMethod("cod")}
                        className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition-all ${
                          deliveryPaymentMethod === "cod"
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border/50 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Banknote className="h-5 w-5" />
                          {deliveryPaymentMethod === "cod" && <CheckCircle className="h-4 w-4" />}
                        </div>
                        <span>Cash on Delivery</span>
                        <span className="text-xs text-muted-foreground font-normal">Pay at door</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-xl border border-border/50 p-4">
                      <CreditCard className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Online Payment Only</p>
                        <p className="text-xs text-muted-foreground">COD is available only for orders up to ₹{COD_LIMIT}.</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Order Summary */}
          <div className="h-fit rounded-xl border border-border/50 p-5 lg:sticky lg:top-20">
            <h2 className="mb-4 font-semibold">Order Summary</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={`${item.productId}-${item.variantId}`} className="flex justify-between text-sm">
                  <span className="line-clamp-1 flex-1 text-muted-foreground">
                    {item.productName} × {item.quantity}
                  </span>
                  <span className="ml-3 shrink-0 font-medium">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t border-border/50 pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {cartMode === "pickup" ? "Payment" : "Shipping"}
                  </span>
                  <span className="text-green-600 dark:text-green-400">
                    {cartMode === "pickup"
                      ? (() => {
                          const eff = localSellerInfo?.pickupAcceptsCOD ? pickupPaymentMethod : "online";
                          if (eff === "online") return "Online (Razorpay)";
                          if (eff === "cod") return "Pay at store (COD)";
                          return "Select payment method";
                        })()
                      : deliveryPaymentMethod === "cod"
                        ? "Cash on Delivery"
                        : "Online (Razorpay)"}
                  </span>
                </div>
                <div className="mt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>

            {cartMode === "pickup" ? (
              <>
                <Button
                  className="mt-5 w-full"
                  size="lg"
                  onClick={handlePickupCheckout}
                  disabled={isProcessing || (localSellerInfo?.pickupAcceptsCOD === true && !pickupPaymentMethod)}
                >
                  {isProcessing ? "Processing..." : (
                    <span className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      {(localSellerInfo?.pickupAcceptsCOD ? pickupPaymentMethod : "online") === "online"
                        ? `Pay ${formatPrice(total)}`
                        : "Place Order (Pay at Store)"}
                    </span>
                  )}
                </Button>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  {(localSellerInfo?.pickupAcceptsCOD ? pickupPaymentMethod : "online") === "online"
                    ? "Secured by Razorpay"
                    : "Pay when you collect at the store"}
                </p>
              </>
            ) : cartMode === "mixed" ? (
              <Button className="mt-5 w-full" size="lg" disabled>
                Clear mixed cart to proceed
              </Button>
            ) : (
              <>
                <Button
                  className="mt-5 w-full"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={isProcessing || cartMode === "loading"}
                >
                  {isProcessing ? "Processing..." : deliveryPaymentMethod === "cod" ? (
                    <span className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Place Order (Pay at Delivery)
                    </span>
                  ) : `Pay ${formatPrice(total)}`}
                </Button>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  {deliveryPaymentMethod === "cod" ? "Pay cash when your order arrives" : "Secured by Razorpay"}
                </p>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
