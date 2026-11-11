import { describe, it, expect } from "vitest";
import { computeLineGst, isIntraState, splitGst } from "./gst";

describe("computeLineGst", () => {
  it("returns full amount with hasGst=false when gstRate is null", () => {
    const result = computeLineGst(100, 2, null);
    expect(result).toEqual({ taxable: 200, gstAmount: 0, hasGst: false });
  });

  it("returns full amount with hasGst=false when gstRate is undefined", () => {
    const result = computeLineGst(100, 1, undefined);
    expect(result.hasGst).toBe(false);
    expect(result.taxable).toBe(100);
  });

  it("splits an inclusive price into taxable value + GST for an 18% slab", () => {
    const result = computeLineGst(118, 1, 18);
    expect(result.hasGst).toBe(true);
    expect(result.taxable).toBeCloseTo(100, 5);
    expect(result.gstAmount).toBeCloseTo(18, 5);
  });

  it("scales correctly with quantity", () => {
    const single = computeLineGst(118, 1, 18);
    const triple = computeLineGst(118, 3, 18);
    expect(triple.taxable).toBeCloseTo(single.taxable * 3, 5);
    expect(triple.gstAmount).toBeCloseTo(single.gstAmount * 3, 5);
  });

  it("handles a 0% GST rate (still marks hasGst=true with zero tax)", () => {
    const result = computeLineGst(100, 1, 0);
    expect(result.hasGst).toBe(true);
    expect(result.taxable).toBeCloseTo(100, 5);
    expect(result.gstAmount).toBeCloseTo(0, 5);
  });
});

describe("isIntraState", () => {
  it("returns true when seller and buyer are in the same state (case-insensitive)", () => {
    expect(isIntraState("Maharashtra", "maharashtra")).toBe(true);
    expect(isIntraState(" Karnataka ", "Karnataka")).toBe(true);
  });

  it("returns false for different states", () => {
    expect(isIntraState("Maharashtra", "Karnataka")).toBe(false);
  });

  it("returns false (defaults to inter-state/IGST) when either state is missing", () => {
    expect(isIntraState(null, "Karnataka")).toBe(false);
    expect(isIntraState("Maharashtra", null)).toBe(false);
    expect(isIntraState(undefined, undefined)).toBe(false);
  });
});

describe("splitGst", () => {
  it("splits evenly into CGST/SGST for intra-state sales", () => {
    expect(splitGst(18, true)).toEqual({ cgst: 9, sgst: 9, igst: 0 });
  });

  it("assigns the full amount to IGST for inter-state sales", () => {
    expect(splitGst(18, false)).toEqual({ cgst: 0, sgst: 0, igst: 18 });
  });
});
