"use client";

import { useEffect } from "react";
import { useCartStore, useWishlistStore } from "@/lib/store";

export function StoreHydration() {
  useEffect(() => {
    useCartStore.persist.rehydrate();
    useWishlistStore.persist.rehydrate();
    // Always force cart closed on init — old localStorage may have isOpen:true
    useCartStore.getState().closeCart();
  }, []);
  return null;
}
