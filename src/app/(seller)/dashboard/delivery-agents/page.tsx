import { DeliveryAgentsClient } from "@/components/seller/DeliveryAgentsClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Delivery Agents" };

export default function DeliveryAgentsPage() {
  return <DeliveryAgentsClient />;
}
