import { describe, expect, it } from "vitest";
import { calcDiscount, parseVariantLabel } from "./product-utils";

describe("product utilities", () => {
  it("calculates a percentage discount from compare price", () => {
    expect(calcDiscount(800, 1000)).toBe(20);
    expect(calcDiscount(1000, 900)).toBe(0);
  });

  it("parses JSON variant labels into a readable string", () => {
    expect(parseVariantLabel('{"Size":"100g","Flavor":"Original"}')).toBe("100g · Original");
  });

  it("falls back to the raw value when the label is not JSON", () => {
    expect(parseVariantLabel("Blue")).toBe("Blue");
  });
});
