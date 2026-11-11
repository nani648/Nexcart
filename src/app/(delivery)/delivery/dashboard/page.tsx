export const dynamic = "force-dynamic";
import { DeliveryAgentDashboard } from "@/components/delivery/DeliveryAgentDashboard";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Delivery Dashboard" };

export default function DeliveryDashboardPage() {
  return <DeliveryAgentDashboard />;
}
