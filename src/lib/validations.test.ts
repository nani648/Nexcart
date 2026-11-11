import { describe, it, expect } from "vitest";
import { gstinSchema, productSchema, sellerProfileSchema, sellerRegistrationSchema, addressSchema } from "./validations";

describe("gstinSchema", () => {
  it("accepts a valid GSTIN", () => {
    expect(gstinSchema.safeParse("27ABCDE1234F1Z5").success).toBe(true);
  });

  it("uppercases and trims before validating", () => {
    const result = gstinSchema.safeParse(" 27abcde1234f1z5 ");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("27ABCDE1234F1Z5");
  });

  it("rejects an invalid GSTIN", () => {
    expect(gstinSchema.safeParse("INVALID123").success).toBe(false);
  });
});

describe("productSchema", () => {
  const base = {
    name: "Test Product",
    description: "A perfectly fine description for testing.",
    price: 999,
    stock: 10,
    images: ["https://example.com/a.jpg"],
    tags: [],
    isActive: true,
    isFeatured: false,
    condition: "ORIGINAL" as const,
  };

  it("accepts a product without gstRate/hsnCode (both optional)", () => {
    expect(productSchema.safeParse(base).success).toBe(true);
  });

  it("accepts a valid GST rate slab and HSN code", () => {
    const result = productSchema.safeParse({ ...base, gstRate: 18, hsnCode: "6109" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid (non-standard) GST rate", () => {
    const result = productSchema.safeParse({ ...base, gstRate: 17 });
    expect(result.success).toBe(false);
  });

  it("accepts gstRate of 0", () => {
    expect(productSchema.safeParse({ ...base, gstRate: 0 }).success).toBe(true);
  });

  it("rejects a non-positive price", () => {
    expect(productSchema.safeParse({ ...base, price: 0 }).success).toBe(false);
  });
});

describe("sellerProfileSchema", () => {
  it("accepts an empty gstin and state (both optional)", () => {
    const result = sellerProfileSchema.safeParse({ storeName: "My Store", gstin: "", state: "" });
    expect(result.success).toBe(true);
  });

  it("accepts a valid state", () => {
    const result = sellerProfileSchema.safeParse({ storeName: "My Store", state: "Maharashtra" });
    expect(result.success).toBe(true);
  });

  it("accepts a floating bar configuration", () => {
    const result = sellerProfileSchema.safeParse({
      storeName: "My Store",
      floatingBarConfig: {
        enabled: true,
        message: "Flash sale now live",
        ctaText: "Shop now",
        ctaLink: "https://example.com",
        backgroundColor: "#111827",
        textColor: "#ffffff",
        position: "bottom-right",
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("sellerRegistrationSchema", () => {
  it("allows registration without a GSTIN", () => {
    const result = sellerRegistrationSchema.safeParse({ storeName: "New Store", gstin: "" });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed GSTIN if one is provided", () => {
    const result = sellerRegistrationSchema.safeParse({ storeName: "New Store", gstin: "BADGSTIN" });
    expect(result.success).toBe(false);
  });
});

describe("addressSchema", () => {
  it("validates a well-formed Indian address", () => {
    const result = addressSchema.safeParse({
      name: "Jane Doe",
      phone: "9876543210",
      line1: "123 MG Road",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
    });
    expect(result.success).toBe(true);
  });
});
