"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/context/AuthContext";
import { Loader2, Truck } from "lucide-react";

export default function DeliveryLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace("/sign-in");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/user", { headers: { Authorization: `Bearer ${user.uid}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.role === "DELIVERY_AGENT") {
          setAuthorized(true);
        } else {
          router.replace("/");
        }
      })
      .finally(() => setChecking(false));
  }, [user, router]);

  if (loading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || !authorized) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
            <Truck className="h-4 w-4 text-background" />
          </div>
          <span className="text-sm font-semibold">Delivery Portal</span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
    </div>
  );
}
