import { Metadata } from "next";
import { OffersManager } from "@/components/seller/OffersManager";

export const metadata: Metadata = {
  title: "Offers — Seller Dashboard",
};

export default function OffersPage() {
  return <OffersManager />;
}
