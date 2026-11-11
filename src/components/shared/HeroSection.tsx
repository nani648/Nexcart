import dynamic from "next/dynamic";
import { CategoryIcons } from "@/components/shared/CategoryIcons";

const HeroCarousel = dynamic(
  () => import("@/components/shared/HeroCarousel").then((mod) => ({ default: mod.HeroCarousel })),
  { ssr: false, loading: () => <div className="bg-[#010a1e]" style={{ minHeight: 360 }} /> }
);

export function HeroSection() {
  return (
    <>
      <HeroCarousel />
      <CategoryIcons />
    </>
  );
}
