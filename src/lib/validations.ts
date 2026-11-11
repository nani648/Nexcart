import { z } from "zod";
import { normalizeHandle, validateHandle } from "@/lib/store-handle";

// Standard Indian GSTIN format: 2-digit state code + 10-char PAN +
// 1-digit entity number + 'Z' (fixed) + 1 alphanumeric checksum.
// e.g. 27ABCDE1234F1Z5
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(GSTIN_REGEX, "Enter a valid 15-character GSTIN (e.g. 27ABCDE1234F1Z5)");

export const productSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(200),
  description: z.string().min(10, "Description must be at least 10 characters").max(5000),
  price: z.number().positive("Price must be positive"),
  comparePrice: z.number().positive().optional(),
  stock: z.number().int().min(0, "Stock cannot be negative"),
  categoryId: z.string().optional(),
  images: z.array(z.string().url()).min(1, "At least one image required"),
  tags: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  // Manual override for the card's info panel — see schema.prisma comment.
  // Optional/blank means "auto" (show name + description as before).
  cardDisplayText: z.string().trim().max(200, "Keep it under 200 characters").optional().or(z.literal("")),
  // Colour/gradient for a thin padded border frame around THIS product's
  // card, set per-product on the Edit design page. Empty/omitted means
  // "no border" — unchanged look.
  cardBorderColor: z.string().regex(/^#[0-9a-fA-F]{6}(,#[0-9a-fA-F]{6})?$/, "Must be a valid hex color or hex,hex gradient pair").optional().or(z.literal("")),
  // Focal point for the storefront card's cover photo — a CSS object-position
  // value in "X% Y%" form (0-100 each), set by dragging the photo in the
  // Product Card Design preview. Empty/omitted means "center center".
  cardImagePosition: z.string().regex(/^\d{1,3}% \d{1,3}%$/, "Must be a position like \"50% 50%\"").nullable().optional().or(z.literal("")),
  // Whether the storefront card's variant picker (size/color dropdown) shows
  // for this product — see schema.prisma comment. Defaults to true so every
  // existing product keeps its current look.
  showVariantsOnCard: z.boolean().default(true),
  condition: z.enum(["ORIGINAL", "REFURBISHED", "BOX_OPEN"]).default("ORIGINAL"),
  deliveryInfo: z.string().max(100).nullable().optional(),
  // GST rate slab (%) for invoice generation — standard Indian slabs.
  gstRate: z.union([z.literal(0), z.literal(5), z.literal(12), z.literal(18), z.literal(28)]).nullable().optional(),
  hsnCode: z.string().trim().max(15).nullable().optional(),
});

/**
 * Vanity store handle (nexcart.com/<handle>).
 * Input is normalised first — sellers paste "@pickles_02" or a full Instagram
 * URL far more often than a bare handle — then checked for shape, length and
 * reserved words. Uniqueness is enforced at the DB layer, not here.
 */
export const storeHandleSchema = z
  .string()
  .transform(normalizeHandle)
  .superRefine((handle, ctx) => {
    const result = validateHandle(handle);
    if (!result.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.error });
    }
  });

export const sellerProfileSchema = z.object({
  storeName: z.string().min(3, "Store name must be at least 3 characters"),
  // Optional so existing sellers (registered before handles existed) can PATCH
  // other settings without being forced to pick one mid-edit.
  storeHandle: storeHandleSchema.optional().or(z.literal("")),
  description: z.string().optional(),
  // Optional here so existing sellers (registered before GSTIN was
  // required) can still PATCH other fields without being blocked.
  // New registrations must go through sellerRegistrationSchema below,
  // which makes it mandatory.
  gstin: gstinSchema.optional().or(z.literal("")),
  // Principal place of business state — used for CGST/SGST vs IGST on invoices.
  state: z.string().trim().max(50).optional().or(z.literal("")),
  logo: z.string().url().optional(),
  banner: z.string().url().optional(),
  isLocalStore: z.boolean().optional(),
  storeAddress: z.string().optional(),
  pickupHours: z.string().optional(),
  pickupAcceptsCOD: z.boolean().optional(),
  highlights: z.array(z.string().url()).optional(),
  spinWheelEnabled: z.boolean().optional(),
  festivalThemeEnabled: z.boolean().optional(),
  shakeConfig: z.object({
    enabled: z.boolean(),
    type: z.enum(["product","category","message","banner"]),
    product: z.object({
      id: z.string(), productId: z.string(), name: z.string(),
      image: z.string(), price: z.number(), comparePrice: z.number().optional(), sellerId: z.string(),
    }).optional(),
    category: z.string().optional(),
    message: z.object({ emoji: z.string(), title: z.string(), body: z.string() }).optional(),
    banner: z.object({ url: z.string(), link: z.string().optional() }).optional(),
  }).optional(),
  floatingBarConfig: z.object({
    enabled: z.boolean().default(false),
    message: z.string().max(140).optional().or(z.literal("")),
    ctaText: z.string().max(30).optional().or(z.literal("")),
    ctaLink: z.string().max(250).optional().or(z.literal("")),
    backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color").optional().or(z.literal("")),
    textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color").optional().or(z.literal("")),
    position: z.enum(["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"]).optional(),
  }).optional(),
  // Animated banner overlay — see src/lib/scrolling-designs.ts for the fixed
  // set of valid effect keys. `effect` is intentionally a plain string (not
  // z.enum) so the list of designs can grow later without breaking old
  // saved values — an unrecognized key just renders nothing (see
  // ScrollingDesignOverlay.tsx), never a validation error or a crash.
  scrollingDesign: z.object({
    enabled: z.boolean(),
    effect: z.string().max(50).optional(),
  }).optional(),
  // Either a single hex ("#rrggbb") for a flat colour, or two hexes joined by a
  // comma ("#rrggbb,#rrggbb") for a custom two-tone gradient. See the "Page
  // Colour" section of the seller settings page — sellers can pick a solid
  // preset, a professional gradient preset, or build their own gradient from
  // two colour pickers.
  storeColor: z.string().regex(/^#[0-9a-fA-F]{6}(,#[0-9a-fA-F]{6})?$/, "Must be a valid hex color or hex,hex gradient pair").optional().or(z.literal("")),
  // Independent background colour/gradient for the storefront page area
  // behind the product grid. Empty string (or omitted) means "auto" — a
  // low-opacity tint of the banner colour, computed at render time.
  productBgColor: z.string().regex(/^#[0-9a-fA-F]{6}(,#[0-9a-fA-F]{6})?$/, "Must be a valid hex color or hex,hex gradient pair").optional().or(z.literal("")),
  storePaused: z.boolean().optional(),
  storePausedMsg: z.string().max(120).optional(),
  quickTags: z.array(z.string().max(40)).max(20).optional(),
  spinWheelSegments: z.array(
    z.object({
      label: z.string().min(1).max(20),
      code: z.string().nullable().optional(),
      color: z.string().optional(),
    })
  ).min(2).max(16).optional(),
});

// Used at registration time — GSTIN is OPTIONAL for new sellers. Sellers can
// add it later (from Settings) before their first sale, or it'll be required
// before they can request a payout. If provided, it must be a valid 15-char GSTIN.
export const sellerRegistrationSchema = sellerProfileSchema.extend({
  gstin: gstinSchema.optional().or(z.literal("")),
});
export type SellerRegistrationInput = z.infer<typeof sellerRegistrationSchema>;

export const addressSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian phone number"),
  line1: z.string().min(5, "Address line is required"),
  line2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().regex(/^\d{6}$/, "Invalid pincode"),
  country: z.string().default("India"),
  isDefault: z.boolean().default(false),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  body: z.string().max(3000).optional(),
});

export const couponSchema = z
  .object({
    code: z.string().min(3).toUpperCase(),
    discountType: z.enum(["percentage", "fixed"]),
    discount: z.number().positive(),
    minOrder: z.number().min(0).default(0),
    maxUses: z.number().int().positive().optional(),
    expiresAt: z.date().optional(),
  })
  .refine(
    (data) => data.discountType !== "percentage" || data.discount <= 100,
    { message: "Percentage discount cannot exceed 100", path: ["discount"] }
  );

export type ProductInput = z.infer<typeof productSchema>;
export type SellerProfileInput = z.infer<typeof sellerProfileSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type CouponInput = z.infer<typeof couponSchema>;
