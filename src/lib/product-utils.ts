export function calcDiscount(price: number, comparePrice?: number | null): number {
  if (!comparePrice || comparePrice <= price) return 0;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}

export function parseVariantLabel(value: string): string {
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === "object" && parsed !== null) {
      return Object.values(parsed).filter(Boolean).join(" · ");
    }
  } catch {
    // fall back to the raw value below
  }
  return value;
}
