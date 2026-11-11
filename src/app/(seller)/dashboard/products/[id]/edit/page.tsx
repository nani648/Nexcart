"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { SpecFields } from "@/components/seller/product-upload/SpecFields";
import { VariantManager, type ComboVariantRow } from "@/components/seller/product-upload/VariantManager";
import { ProductDesignPicker } from "@/components/seller/product-upload/ProductDesignPicker";
import { Switch as VariantSwitch } from "@/components/ui/switch";
import { productSchema, type ProductInput } from "@/lib/validations";
import { auth } from "@/lib/firebase";
import { DEFAULT_CARD_DESIGN, DEFAULT_CARD_FONT } from "@/lib/card-designs";
import { CATEGORY_CONFIG, type ProductType } from "@/lib/category-config";

// Helper: find ProductType config by id across all categories
function findProductType(productTypeId: string): ProductType | null {
  for (const cat of CATEGORY_CONFIG) {
    const pt = cat.productTypes.find((p) => p.id === productTypeId);
    if (pt) return pt;
  }
  return null;
}

// Helper: sensible default variant types based on category when no productTypeId
function getDefaultVariantTypes(categorySlug: string): string[] {
  switch (categorySlug) {
    case "electronics":
    case "computer-parts":
    case "photography":
      return ["Storage", "Color", "RAM"];
    case "fashion":
    case "baby":
    case "sports":
      return ["Size", "Color"];
    case "beauty":
    case "health":
      return ["Shade", "Size"];
    case "grocery":
    case "fresh-food":
      return ["Weight", "Pack"];
    case "furniture":
    case "home-kitchen":
      return ["Color", "Size"];
    case "accessories":
    case "optical":
    case "travel":
      return ["Color", "Size"];
    default:
      return ["Size", "Color"];
  }
}

// Feature Bullets Editor
function FeatureBulletsEditor({
  bullets,
  onChange,
}: {
  bullets: string[];
  onChange: (b: string[]) => void;
}) {
  const add = () => onChange([...bullets, ""]);
  const update = (i: number, val: string) => {
    const next = [...bullets];
    next[i] = val;
    onChange(next);
  };
  const remove = (i: number) => onChange(bullets.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-gray-700">
          Key Features
        </Label>
        <span className="text-[10px] text-gray-400">{bullets.length}/6</span>
      </div>
      <div className="space-y-2">
        {bullets.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" />
            <Input
              value={b}
              onChange={(e) => update(i, e.target.value)}
              placeholder={`Feature ${i + 1}`}
              className="h-9 text-sm flex-1"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-gray-300 hover:text-red-400 transition-colors p-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      {bullets.length < 6 && (
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium mt-1"
        >
          <Plus className="h-3 w-3" />
          Add feature bullet
        </button>
      )}
    </div>
  );
}

// In-the-Box Editor
function InTheBoxEditor({
  items,
  onChange,
}: {
  items: string[];
  onChange: (i: string[]) => void;
}) {
  const add = () => onChange([...items, ""]);
  const update = (i: number, val: string) => {
    const next = [...items];
    next[i] = val;
    onChange(next);
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-gray-700">In The Box</Label>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(e) => update(i, e.target.value)}
              placeholder="Item"
              className="h-9 text-sm flex-1"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-gray-300 hover:text-red-400 p-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
      >
        <Plus className="h-3 w-3" />
        Add item
      </button>
    </div>
  );
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [specValues, setSpecValues] = useState<Record<string, string>>({});
  const [productType, setProductType] = useState<ProductType | null>(null);
  const [categorySlug, setCategorySlug] = useState<string>("");
  const [hasVariants, setHasVariants] = useState(false);
  const [variantRows, setVariantRows] = useState<ComboVariantRow[]>([]);
  // Whether the storefront card's variant picker (size/color dropdown) shows
  // for this product. Defaults to true (current behaviour) until the fetched
  // product's own saved value overrides it below.
  const [showVariantsOnCard, setShowVariantsOnCard] = useState(true);
  const [variantImages, setVariantImages] = useState<Record<string, { front?: string; back?: string }>>({});
  const [colorUploadLoading, setColorUploadLoading] = useState<Record<string, boolean>>({});
  const [colorDragOver, setColorDragOver] = useState<string | null>(null);
  const [tagsInput, setTagsInput] = useState("");
  const [deliveryInfoValue, setDeliveryInfoValue] = useState("");
  const [gstRateValue, setGstRateValue] = useState("");
  const [hsnCodeValue, setHsnCodeValue] = useState("");
  const [cardDesignValue, setCardDesignValue] = useState<string>(DEFAULT_CARD_DESIGN);
  const [cardFontValue, setCardFontValue] = useState<string>(DEFAULT_CARD_FONT);
  // Focal point for the cover photo's storefront crop — "X% Y%", or "" for
  // center (default). Set by dragging in ImagePositionPicker.
  const [imagePositionValue, setImagePositionValue] = useState<string>("");
  // Enriched fields
  const [featureBullets, setFeatureBullets] = useState<string[]>([]);
  const [inTheBox, setInTheBox] = useState<string[]>([]);
  const [warranty, setWarranty] = useState("");
  const [warrantyType, setWarrantyType] = useState("");
  const [brand, setBrand] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [countryOfOrigin, setCountryOfOrigin] = useState("India");
  const [searchKeywords, setSearchKeywords] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    shouldUnregister: false,
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      comparePrice: undefined,
      stock: 0,
      isActive: true,
      isFeatured: false,
      condition: "ORIGINAL",
      tags: [],
      images: [],
      categoryId: undefined,
    },
  });

  const isActive = watch("isActive");
  const isFeatured = watch("isFeatured");
  const watchedStock = watch("stock");

  // Load product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/products/${productId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        // Populate form fields — use both reset + explicit setValue for reliability
        const formData = {
          name: data.name || "",
          description: data.description || "",
          price: data.price,
          comparePrice: data.comparePrice || undefined,
          stock: data.stock,
          images: data.images || [],
          tags: data.tags || [],
          isActive: data.isActive ?? true,
          isFeatured: data.isFeatured ?? false,
          categoryId: data.categoryId || undefined,
          condition: data.condition || "ORIGINAL",
        };
        reset(formData);
        // Explicitly setValue for each field to handle ref timing edge cases
        (Object.entries(formData) as [keyof typeof formData, unknown][]).forEach(([key, value]) => {
          setValue(key, value as never);
        });

        setImageUrls(data.images || []);

        // Tags
        if (data.tags?.length) {
          setTagsInput(data.tags.join(", "));
        }

        // Delivery info
        if (data.deliveryInfo) setDeliveryInfoValue(data.deliveryInfo);

        // Card design / text style — fall back to defaults if never set (products predating this feature)
        setCardDesignValue(data.cardDesign || DEFAULT_CARD_DESIGN);
        setCardFontValue(data.cardFont || DEFAULT_CARD_FONT);
        setImagePositionValue(data.cardImagePosition || "");
        setShowVariantsOnCard(data.showVariantsOnCard ?? true);

        // GST details
        if (data.gstRate !== null && data.gstRate !== undefined) setGstRateValue(String(data.gstRate));
        if (data.hsnCode) setHsnCodeValue(data.hsnCode);

        // Specifications — separate public specs from private enriched fields
        if (data.specifications && typeof data.specifications === "object") {
          const specs = data.specifications as Record<string, unknown>;
          // Public specs (no underscore prefix) → shown in Product Specifications section
          const publicSpecs = Object.fromEntries(
            Object.entries(specs)
              .filter(([k]) => !k.startsWith("_"))
              .map(([k, v]) => [k, String(v ?? "")])
          );
          setSpecValues(publicSpecs);
          // Private enriched fields (underscore prefix) stored inside specifications
          if (specs._featureBullets && Array.isArray(specs._featureBullets)) setFeatureBullets(specs._featureBullets as string[]);
          if (specs._inTheBox && Array.isArray(specs._inTheBox)) setInTheBox(specs._inTheBox as string[]);
          if (specs._warranty) setWarranty(specs._warranty as string);
          if (specs._warrantyType) setWarrantyType(specs._warrantyType as string);
          if (specs._brand) setBrand(specs._brand as string);
          if (specs._modelNumber) setModelNumber(specs._modelNumber as string);
          if (specs._countryOfOrigin) setCountryOfOrigin(specs._countryOfOrigin as string);
          if (specs._searchKeywords && Array.isArray(specs._searchKeywords)) setSearchKeywords((specs._searchKeywords as string[]).join(", "));
        }

        // Variant images (colour → { front, back } mapping, with backward compat for old string format)
        if (data.variantImages && typeof data.variantImages === "object") {
          const raw = data.variantImages as Record<string, unknown>;
          const migrated: Record<string, { front?: string; back?: string }> = {};
          for (const [k, v] of Object.entries(raw)) {
            if (typeof v === "string") migrated[k] = { front: v };
            else if (v && typeof v === "object") migrated[k] = v as { front?: string; back?: string };
          }
          setVariantImages(migrated);
        }

        // Category slug — used for variant fallback when no productTypeId
        if (data.category?.slug) setCategorySlug(data.category.slug);

        // Product type → load specFields config
        if (data.productTypeId) {
          const pt = findProductType(data.productTypeId);
          setProductType(pt);
        }

        // Variants
        if (data.variants?.length) {
          setHasVariants(true);
          const rows: ComboVariantRow[] = data.variants.map((v: {
            id: string;
            name: string;
            value?: string;
            combo?: Record<string, string>;
            price: number | null;
            stock: number;
          }) => {
            // Parse combo from value JSON string (DB stores as JSON string in `value` field)
            let combo: Record<string, string> = v.combo || {};
            if (!Object.keys(combo).length && v.value) {
              try {
                const parsed = JSON.parse(v.value);
                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) combo = parsed as Record<string, string>;
              } catch { /* keep {} */ }
            }
            return ({
            id: v.id,
            label: v.name,
            combo,
            price: v.price != null ? String(v.price) : "",
            comparePrice: "",
            stock: String(v.stock ?? 0),
          });});
          setVariantRows(rows);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load product");
        router.push("/dashboard/products");
      } finally {
        setFetching(false);
      }
    };
    fetchProduct();
  }, [productId, reset, router]);

  const handleImagesChange = (urls: string[]) => {
    setImageUrls(urls);
    setValue("images", urls);
  };

  const handleSpecChange = (key: string, value: string) => {
    setSpecValues((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (data: ProductInput) => {
    if (hasVariants && variantRows.some((v) => !v.stock.trim())) {
      toast.error("Fill in all stock amounts for variants");
      return;
    }

    setLoading(true);
    try {
      const token = auth.currentUser?.uid ?? (() => { try { return localStorage.getItem("nxc-uid"); } catch { return null; } })();

      const payload = {
        ...data,
        deliveryInfo: deliveryInfoValue.trim() || null,
        gstRate: gstRateValue !== "" ? parseFloat(gstRateValue) : null,
        hsnCode: hsnCodeValue.trim() || null,
        cardDesign: cardDesignValue,
        cardFont: cardFontValue,
        cardImagePosition: imagePositionValue || null,
        showVariantsOnCard,
        // Merge public specs + all enriched private fields into one specifications object
        specifications: {
          ...specValues,
          ...(brand ? { _brand: brand } : {}),
          ...(modelNumber ? { _modelNumber: modelNumber } : {}),
          ...(countryOfOrigin ? { _countryOfOrigin: countryOfOrigin } : {}),
          ...(warranty ? { _warranty: warranty } : {}),
          ...(warrantyType ? { _warrantyType: warrantyType } : {}),
          ...(featureBullets.filter(Boolean).length ? { _featureBullets: featureBullets.filter(Boolean) } : {}),
          ...(inTheBox.filter(Boolean).length ? { _inTheBox: inTheBox.filter(Boolean) } : {}),
          ...(searchKeywords.trim() ? { _searchKeywords: searchKeywords.split(",").map(k => k.trim()).filter(Boolean) } : {}),
        },
        variantImages: Object.keys(variantImages).length > 0 ? variantImages : undefined,
        ...(hasVariants && variantRows.length > 0
          ? {
              price: Math.min(
                ...variantRows.map(
                  (v) => parseFloat(v.price || "0") || parseFloat(String(data.price))
                )
              ),
              stock: variantRows.reduce((sum, v) => sum + parseInt(v.stock || "0"), 0),
            }
          : {}),
      };

      // Update the main product
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update");

      // Update variants — delete all existing then recreate with updated prices/stock
      if (hasVariants && variantRows.length > 0) {
        // Step 1: Delete all existing variants for this product
        const existingVarIds = variantRows.map(v => v.id).filter(Boolean);
        await Promise.all(
          existingVarIds.map(id =>
            fetch(`/api/products/variants?id=${id}`, {
              method: "DELETE",
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            }).catch(() => {}) // ignore errors for variants that don't exist
          )
        );

        // Step 2: Create fresh variants with updated prices & stock
        await Promise.all(
          variantRows.map((v) =>
            fetch("/api/products/variants", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                productId,
                name: v.label,
                value: JSON.stringify(v.combo && Object.keys(v.combo).length ? v.combo : { variant: v.label }),
                combo: v.combo,
                price: v.price ? parseFloat(v.price) : null,
                stock: parseInt(v.stock || "0"),
              }),
            })
          )
        );
      }

      toast.success("Product updated successfully!");
      // The products list caches its data in localStorage for 5 minutes
      // (see PROD_KEY in that page) so it can render instantly on repeat
      // visits. Without clearing it here, navigating back right after this
      // save would show the pre-edit thumbnail/price/etc. for up to 5
      // minutes — this update would look like it silently didn't take.
      try { localStorage.removeItem("nxc-prods-v1"); } catch {}
      router.push("/dashboard/products");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Note: form is always rendered (no fetching gate) so react-hook-form fields
  // are registered before reset()/setValue() are called — this guarantees values populate.

  return (
    <div className={fetching ? "pointer-events-none opacity-60" : ""}>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/dashboard/products">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Edit Product</h1>
        {fetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Main column ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Product Details */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <h2 className="font-medium text-gray-900">Product Details</h2>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs text-gray-600 font-medium">
                Product Name <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input id="name" {...field} value={field.value ?? ""} className="h-9 text-sm border-gray-200" />
                )}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs text-gray-600 font-medium">
                Description <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <Textarea id="description" {...field} value={field.value ?? ""} rows={4} className="text-sm border-gray-200 resize-none" />
                )}
              />
              {errors.description && (
                <p className="text-xs text-red-500">{errors.description.message}</p>
              )}
            </div>

            {/* Product Identity Fields */}
            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600 font-medium">Brand Name</Label>
                <Input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Brand"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600 font-medium">Model Number</Label>
                <Input
                  value={modelNumber}
                  onChange={(e) => setModelNumber(e.target.value)}
                  placeholder="Model"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600 font-medium">Country of Origin</Label>
                <Select value={countryOfOrigin} onValueChange={setCountryOfOrigin}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["India", "China", "USA", "Japan", "South Korea", "Taiwan", "Germany", "Other"].map((c) => (
                      <SelectItem key={c} value={c} className="text-sm">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600 font-medium">Condition <span className="text-red-500">*</span></Label>
                <Select value={watch("condition")} onValueChange={(value) => setValue("condition", value as "ORIGINAL" | "REFURBISHED" | "BOX_OPEN")}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ORIGINAL" className="text-sm">
                      Original (New)
                    </SelectItem>
                    <SelectItem value="REFURBISHED" className="text-sm">
                      Refurbished
                    </SelectItem>
                    <SelectItem value="BOX_OPEN" className="text-sm">
                      Box Open
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Price & Stock */}
            {!hasVariants && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="price" className="text-xs text-gray-600 font-medium">
                    Price (₹) <span className="text-red-500">*</span>
                  </Label>
                  <Controller name="price" control={control} render={({ field }) => (
                    <Input id="price" type="number" step="0.01" {...field} value={field.value ?? ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} className="h-9 text-sm border-gray-200" />
                  )} />
                  {errors.price && <p className="text-xs text-red-500">{errors.price.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="comparePrice" className="text-xs text-gray-600 font-medium">
                    Compare Price (₹)
                  </Label>
                  <Controller name="comparePrice" control={control} render={({ field }) => (
                    <Input id="comparePrice" type="number" step="0.01" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} className="h-9 text-sm border-gray-200" />
                  )} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="stock" className="text-xs text-gray-600 font-medium">
                    Stock <span className="text-red-500">*</span>
                  </Label>
                  <Controller name="stock" control={control} render={({ field }) => (
                    <Input id="stock" type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(parseInt(e.target.value) || 0)} className="h-9 text-sm border-gray-200" />
                  )} />
                  {errors.stock && <p className="text-xs text-red-500">{errors.stock.message}</p>}
                </div>
              </div>
            )}

            {/* GST details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-gray-100 pt-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600 font-medium">GST Rate (%)</Label>
                <select
                  value={gstRateValue}
                  onChange={(e) => setGstRateValue(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-gray-200 bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Not set</option>
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600 font-medium">HSN Code</Label>
                <Input
                  value={hsnCodeValue}
                  onChange={(e) => setHsnCodeValue(e.target.value)}
                  placeholder="e.g. 6109"
                  maxLength={15}
                  className="h-9 text-sm border-gray-200"
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-1.5 border-t border-gray-100 pt-4">
              <Label className="text-xs text-gray-600 font-medium">
                Tags <span className="text-gray-400 font-normal">(comma-separated)</span>
              </Label>
              <Input
                value={tagsInput}
                onChange={(e) => {
                  setTagsInput(e.target.value);
                  setValue(
                    "tags",
                    e.target.value.split(",").map((t) => t.trim()).filter(Boolean)
                  );
                }}
                placeholder="e.g. smartphone, android, 5g"
                className="h-9 text-sm border-gray-200"
              />
            </div>
          </div>

          {/* Delivery Info */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
            <div>
              <h2 className="font-medium text-gray-900">Delivery Info</h2>
              <p className="text-xs text-gray-500 mt-0.5">Shown on product cards. Leave blank to show nothing.</p>
            </div>
            <Input
              value={deliveryInfoValue}
              onChange={(e) => setDeliveryInfoValue(e.target.value)}
              placeholder="e.g. Free Delivery over ₹800"
              maxLength={100}
              className="h-9 text-sm border-gray-200"
            />
          </div>

          {/* Features & In The Box */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-6">
            <div>
              <h2 className="font-medium text-gray-900 mb-4">Key Features & Details</h2>
              <FeatureBulletsEditor bullets={featureBullets} onChange={setFeatureBullets} />
            </div>
            <div className="border-t border-gray-100 pt-6">
              <InTheBoxEditor items={inTheBox} onChange={setInTheBox} />
            </div>
          </div>

          {/* Warranty */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <h2 className="font-medium text-gray-900">Warranty & Service</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600 font-medium">Warranty Duration</Label>
                <Select value={warranty} onValueChange={setWarranty}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select warranty" />
                  </SelectTrigger>
                  <SelectContent>
                    {["No Warranty", "3 Months", "6 Months", "1 Year", "2 Years", "3 Years", "Lifetime"].map((w) => (
                      <SelectItem key={w} value={w} className="text-sm">
                        {w}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600 font-medium">Warranty Type</Label>
                <Select value={warrantyType} onValueChange={setWarrantyType}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Manufacturer Warranty", "Seller Warranty", "Brand Warranty", "International Warranty"].map((t) => (
                      <SelectItem key={t} value={t} className="text-sm">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Search Keywords */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <h2 className="font-medium text-gray-900">Search Keywords</h2>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600 font-medium">
                Keywords <span className="text-gray-400 font-normal">(comma-separated, hidden from customers)</span>
              </Label>
              <Textarea
                value={searchKeywords}
                onChange={(e) => setSearchKeywords(e.target.value)}
                placeholder="Keywords to improve discoverability"
                rows={3}
                className="text-sm border-gray-200 resize-none"
              />
            </div>
          </div>

          {/* Product Specifications */}
          {productType && productType.specFields.length > 0 && (
            <SpecFields
              fields={productType.specFields}
              values={specValues}
              onChange={handleSpecChange}
            />
          )}

          {/* Product Images */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
            <div>
              <h2 className="font-medium text-gray-900">Product Images</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Upload up to 30 images. First image is the cover.
              </p>
            </div>
            <ImageUpload
              value={imageUrls}
              onChange={handleImagesChange}
              maxImages={30}
              folder="nexcart/products"
              authToken={auth.currentUser?.uid}
              enableCoverPositioning
            />
            {errors.images && (
              <p className="text-xs text-red-500">{errors.images.message}</p>
            )}
          </div>

          {/* Product Variants */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-medium text-gray-900">Product Variants</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Enable for different {(productType?.variantTypes ?? getDefaultVariantTypes(categorySlug)).join(", ")}.
                </p>
              </div>
              <VariantSwitch checked={hasVariants} onCheckedChange={setHasVariants} />
            </div>

            {hasVariants && (
              <>
                {/* Base price when variants on */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="price" className="text-xs text-gray-600 font-medium">
                      Base Price (₹) <span className="text-red-500">*</span>
                    </Label>
                    <Controller name="price" control={control} render={({ field }) => (
                      <Input id="price" type="number" step="0.01" {...field} value={field.value ?? ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} className="h-9 text-sm border-gray-200" />
                    )} />
                    {errors.price && (
                      <p className="text-xs text-red-500">{errors.price.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="comparePrice" className="text-xs text-gray-600 font-medium">
                      Compare Price (₹)
                    </Label>
                    <Controller name="comparePrice" control={control} render={({ field }) => (
                      <Input id="comparePrice" type="number" step="0.01" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} className="h-9 text-sm border-gray-200" />
                    )} />
                  </div>
                </div>

                <VariantManager
                  variantTypes={productType?.variantTypes ?? getDefaultVariantTypes(categorySlug)}
                  rows={variantRows}
                  onRowsChange={setVariantRows}
                  basePrice={String(watch("price") || "")}
                  baseComparePrice={String(watch("comparePrice") || "")}
                  baseStock={String(watchedStock || "0")}
                  productTypeId={productType?.id}
                />

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-gray-800">Show Variants on Product Card</p>
                    <p className="text-xs text-gray-500">Let shoppers pick a size/colour right from the card. Turn off to keep the card clean — they&apos;ll choose on the product page instead.</p>
                  </div>
                  <VariantSwitch checked={showVariantsOnCard} onCheckedChange={setShowVariantsOnCard} />
                </div>
              </>
            )}
          </div>

          {/* Product Card Design */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
            <div>
              <h2 className="font-medium text-gray-900">Product Card Design</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Choose how this product&apos;s card looks on your storefront and in search.
              </p>
            </div>
            <ProductDesignPicker
              value={cardDesignValue}
              onChange={setCardDesignValue}
              fontValue={cardFontValue}
              onFontChange={setCardFontValue}
              previewName={watch("name") || ""}
              previewPrice={watch("price") || 0}
              previewComparePrice={watch("comparePrice") || undefined}
              previewImage={imageUrls[0] ?? ""}
              previewStock={watchedStock ?? undefined}
              imagePosition={imagePositionValue}
              onImagePositionChange={setImagePositionValue}
              productId={productId}
            />
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-5">
          {/* Visibility */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            <h2 className="font-medium text-gray-900 text-sm">Visibility</h2>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-600 font-normal">Active listing</Label>
              <Switch
                checked={isActive}
                onCheckedChange={(v) => setValue("isActive", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-600 font-normal">Featured product</Label>
              <Switch
                checked={isFeatured}
                onCheckedChange={(v) => setValue("isFeatured", v)}
              />
            </div>
          </div>

          {/* Variant summary */}
          {hasVariants && variantRows.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
              <p className="text-xs font-medium text-gray-700">Variant Summary</p>
              {variantRows.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between text-xs text-gray-500"
                >
                  <span className="font-medium text-gray-800">{v.label}</span>
                  <span>
                    {v.price ? `₹${v.price}` : "Base price"} · {v.stock || 0} units
                  </span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 flex items-center justify-between text-xs font-semibold text-gray-900">
                <span>Total stock</span>
                <span>
                  {variantRows.reduce((s, v) => s + parseInt(v.stock || "0"), 0)} units
                </span>
              </div>
            </div>
          )}

          {/* ── Colour Front & Back Images ── */}
          {hasVariants && (() => {
            const SWATCHES: Record<string,string> = {black:"#111827",white:"#f9fafb",red:"#ef4444",blue:"#3b82f6",green:"#22c55e",yellow:"#eab308",purple:"#a855f7",pink:"#ec4899",orange:"#f97316",gray:"#6b7280",grey:"#6b7280",navy:"#1e3a5f",brown:"#92400e",teal:"#14b8a6",silver:"#94a3b8",rose:"#f43f5e",coral:"#ff7f7f",maroon:"#7f1d1d",lime:"#84cc16",sky:"#0ea5e9",cream:"#fffdd0",beige:"#d4c5a9"};
            const swCol = (c: string) => { const lv = c.toLowerCase(); for(const [k,v] of Object.entries(SWATCHES)) if(lv.includes(k)) return v; return "#888"; };
            const colorValues = Array.from(new Set(variantRows.flatMap(r => Object.entries(r.combo ?? {}).filter(([k]) => /colou?r/i.test(k)).map(([,v]) => v))));
            if (colorValues.length === 0) return null;

            const uploadColorImg = async (color: string, side: "front" | "back", file: File) => {
              const loadKey = `${color}-${side}`;
              setColorUploadLoading(p => ({ ...p, [loadKey]: true }));
              try {
                const form = new FormData();
                form.append("file", file);
                form.append("folder", "nexcart/products/colour-views");
                const token = auth.currentUser?.uid ?? (() => { try { return localStorage.getItem("nxc-uid"); } catch { return null; } })();
                const r = await fetch("/api/upload", { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
                if (!r.ok) throw new Error("Upload failed");
                const { url } = await r.json();
                setVariantImages(p => ({ ...p, [color]: { ...(p[color] ?? {}), [side]: url } }));
              } catch { toast.error("Image upload failed"); }
              finally { setColorUploadLoading(p => ({ ...p, [loadKey]: false })); }
            };

            return (
              <div className="rounded-xl border border-border/50 p-4 space-y-4">
                <div>
                  <h3 className="text-[13px] font-semibold text-foreground">🎨 Colour Images — Front & Back</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Upload separate Front and Back photos for each colour. Customers will see these when they select a colour.</p>
                </div>
                <div className="space-y-4">
                  {colorValues.map(color => {
                    const ci = variantImages[color] ?? {};
                    return (
                      <div key={color} className="rounded-lg border border-border/30 p-3 space-y-2.5">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-4 w-4 rounded-full border border-border/60 shrink-0" style={{ background: swCol(color) }} />
                          <span className="text-[12px] font-bold text-foreground">{color}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {(["front","back"] as const).map(side => {
                            const url = ci[side];
                            const loadKey = `${color}-${side}`;
                            const loading = colorUploadLoading[loadKey];
                            return (
                              <div key={side} className="space-y-1.5">
                                <p className="text-[11px] font-semibold text-muted-foreground capitalize">{side} View</p>
                                {url ? (
                                  <div className="relative group">
                                    <img src={url} alt={`${color} ${side}`} className="h-20 w-full rounded-lg object-cover border border-border/40" />
                                    <button
                                      type="button"
                                      onClick={() => setVariantImages(p => { const cp = { ...p }; if (cp[color]) { const ci2 = { ...cp[color] }; delete ci2[side]; cp[color] = ci2; } return cp; })}
                                      className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center rounded-full bg-red-500/80 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                                    >✕</button>
                                  </div>
                                ) : (
                                  <div
                                    className={`flex flex-col items-center justify-center h-20 rounded-lg border-2 border-dashed transition-all cursor-pointer select-none
                                      ${loading ? "opacity-60 pointer-events-none" : ""}
                                      ${colorDragOver === loadKey ? "border-blue-500 bg-blue-50 scale-[1.02]" : "border-border/50 hover:border-blue-400 hover:bg-blue-50/50"}
                                    `}
                                    onClick={() => { if (!loading) (document.getElementById(`ecimg-${loadKey}`) as HTMLInputElement)?.click(); }}
                                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); if (!loading) setColorDragOver(loadKey); }}
                                    onDragEnter={e => { e.preventDefault(); e.stopPropagation(); if (!loading) setColorDragOver(loadKey); }}
                                    onDragLeave={e => { e.preventDefault(); e.stopPropagation(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setColorDragOver(null); }}
                                    onDrop={e => {
                                      e.preventDefault(); e.stopPropagation(); setColorDragOver(null);
                                      if (loading) return;
                                      const file = e.dataTransfer.files?.[0];
                                      if (file && file.type.startsWith("image/")) uploadColorImg(color, side, file);
                                    }}
                                  >
                                    <input id={`ecimg-${loadKey}`} type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) uploadColorImg(color, side, f); e.target.value = ""; }} />
                                    {loading
                                      ? <span className="text-[11px] text-muted-foreground">Uploading…</span>
                                      : colorDragOver === loadKey
                                        ? <><span className="text-[18px]">📂</span><span className="text-[10px] text-blue-500 mt-1 font-medium">Drop to upload</span></>
                                        : <><span className="text-[18px]">📷</span><span className="text-[10px] text-muted-foreground mt-1">Drag or click to upload {side}</span></>
                                    }
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <Button type="submit" className="w-full h-10" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full text-red-500 hover:text-red-600 border-red-200 hover:border-red-300"
            onClick={async () => {
              if (!confirm("Are you sure you want to delete this product?")) return;
              const delToken = auth.currentUser?.uid ?? (() => { try { return localStorage.getItem("nxc-uid"); } catch { return null; } })();
              await fetch(`/api/products/${productId}`, {
                method: "DELETE",
                headers: delToken ? { Authorization: `Bearer ${delToken}` } : {},
              });
              toast.success("Product deleted");
              router.push("/dashboard/products");
            }}
          >
            Delete Product
          </Button>
        </div>
      </form>
    </div>
  );
}
