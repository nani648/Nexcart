"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { sellerProfileSchema, GSTIN_REGEX, type SellerProfileInput } from "@/lib/validations";
import { INDIAN_STATES } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import { Check, Home, Store, MapPin, Clock, ToggleLeft, ToggleRight, Gift, Plus, Trash2, Hash, X, PauseCircle, PlayCircle, Palette, ExternalLink, Copy, Link2, LayoutGrid } from "lucide-react";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import { ColorPickerSection } from "@/components/seller/ColorPickerSection";
import { MiniStorePreview } from "@/components/seller/MiniStorePreview";
import { storeUrlFor } from "@/lib/store-url";
import { parseStoreColor, isLightStoreColor, toCssBackground } from "@/lib/store-color";

/**
 * Resolves a raw storeColor-format string ("#rrggbb" or "#rrggbb,#rrggbb")
 * into ready-to-use preview CSS — background, readable text colour, and a
 * matching badge background. Module-level and pure (no component state), so
 * it isn't recreated on every render; used to feed the "other half" of the
 * MiniStorePreview mockup in each colour section below.
 */
function resolvePreviewColors(raw: string, fallback: string) {
  const parsed = parseStoreColor(raw) ?? { primary: fallback, secondary: null };
  const bg = parsed.secondary
    ? `linear-gradient(135deg, ${parsed.primary}, ${parsed.secondary})`
    : `linear-gradient(135deg, ${parsed.primary}, ${parsed.primary}cc)`;
  const isLight = isLightStoreColor(parsed);
  return {
    bg,
    textColor: isLight ? "#151515" : "#ffffff",
    badgeBg: isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.2)",
    primary: parsed.primary,
  };
}

/**
 * Mirrors the real storefront's page-background logic (see
 * SellerStoreClient's `resolvedPageBg`): a saved productBgColor renders
 * full-strength; otherwise "auto" means matching the banner colour exactly
 * (full strength, not a faded tint) — `autoSourceBg` is whatever CSS
 * background that resolves to (already computed by the caller). Used by
 * every MiniStorePreview on this page so "auto" and "custom colour" both
 * preview exactly what a shopper would actually see.
 */
function resolvePageBg(productBgColor: string, autoSourceBg: string): string {
  const parsed = productBgColor ? parseStoreColor(productBgColor) : null;
  return parsed ? toCssBackground(parsed) : autoSourceBg;
}

const DEFAULT_SEGMENTS = [
  { label: "5% OFF",    code: "WIN5",  color: "#f43f5e" },
  { label: "Try Again", code: "",      color: "#94a3b8" },
  { label: "10% OFF",   code: "WIN10", color: "#8b5cf6" },
  { label: "FREE Ship", code: "FSHIP", color: "#10b981" },
  { label: "15% OFF",   code: "WIN15", color: "#f59e0b" },
  { label: "Try Again", code: "",      color: "#64748b" },
  { label: "20% OFF",   code: "WIN20", color: "#3b82f6" },
  { label: "5% OFF",    code: "WIN5",  color: "#ec4899" },
];

type Segment = { label: string; code: string; color: string };
type FloatingBarPosition = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";

export default function SellerSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [storeNameValue, setStoreNameValue] = useState("");
  const [logoUrls, setLogoUrls] = useState<string[]>([]);
  const [storeColor, setStoreColor] = useState<string>("");
  const [colorSaving, setColorSaving] = useState(false);
  // Product background colour — the page area behind the whole product
  // grid (banner excluded). Empty string means "auto": a low-opacity tint
  // of the banner colour, computed on the storefront; a value here renders
  // full-strength instead of that auto tint.
  const [productBgColor, setProductBgColor] = useState<string>("");
  const [productBgColorSaving, setProductBgColorSaving] = useState(false);
  // "My Store" card — sellerId/storeHandle come from the profile fetch below;
  // origin is filled in client-side only (see the effect further down) so the
  // server-rendered HTML and the first client render match exactly (no
  // window on the server -> no hydration mismatch from guessing the host).
  const [sellerId, setSellerId] = useState("");
  const [storeHandle, setStoreHandle] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [isLocalStore, setIsLocalStore] = useState(false);
  const [storeAddress, setStoreAddress] = useState("");
  const [pickupHours, setPickupHours] = useState("");
  const [pickupAcceptsCOD, setPickupAcceptsCOD] = useState(false);
  const [spinWheelEnabled, setSpinWheelEnabled] = useState(false);
  const [segments, setSegments] = useState<Segment[]>(DEFAULT_SEGMENTS);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [festivalThemeEnabled, setFestivalThemeEnabled] = useState(true);
  const [floatingBarEnabled, setFloatingBarEnabled] = useState(false);
  const [floatingBarMessage, setFloatingBarMessage] = useState("Limited-time offers are live");
  const [floatingBarCtaText, setFloatingBarCtaText] = useState("Shop now");
  const [floatingBarCtaLink, setFloatingBarCtaLink] = useState("");
  const [floatingBarBg, setFloatingBarBg] = useState("#111827");
  const [floatingBarTextColor, setFloatingBarTextColor] = useState("#ffffff");
  const [floatingBarPosition, setFloatingBarPosition] = useState<FloatingBarPosition>("bottom-right");

  // Store Availability (Pause Store)
  const [storePaused, setStorePaused] = useState(false);
  const [storePausedMsg, setStorePausedMsg] = useState("");
  const [pauseLoading, setPauseLoading] = useState(false);

  // Quick Tags
  const [quickTags, setQuickTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tagsLoading, setTagsLoading] = useState(false);

  // Shake config
  type ShakeType = "product" | "category" | "message" | "banner";
  interface ShakeProduct { id: string; productId: string; name: string; image: string; price: number; comparePrice?: number; sellerId: string }
  const [shakeEnabled, setShakeEnabled] = useState(false);
  const [shakeType, setShakeType] = useState<ShakeType>("product");
  const [shakeProduct, setShakeProduct] = useState<ShakeProduct | null>(null);
  const [shakeCategory, setShakeCategory] = useState("");
  const [shakeMsgEmoji, setShakeMsgEmoji] = useState("🎉");
  const [shakeMsgTitle, setShakeMsgTitle] = useState("");
  const [shakeMsgBody, setShakeMsgBody] = useState("");
  const [shakeBannerUrl, setShakeBannerUrl] = useState("");
  const [shakeBannerLink, setShakeBannerLink] = useState("");
  const [shakeLoading, setShakeLoading] = useState(false);
  const [shakeProducts, setShakeProducts] = useState<ShakeProduct[]>([]);
  const [shakeCategories, setShakeCategories] = useState<string[]>([]);
  const [shakeProductsLoaded, setShakeProductsLoaded] = useState(false);

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<SellerProfileInput>({
    resolver: zodResolver(sellerProfileSchema),
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      if (!firebaseUser) return;
      const token = firebaseUser.uid;
      fetch("/api/sellers/profile", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          const sn = data.storeName || "";
          setStoreNameValue(sn);
          reset({
            storeName: sn,
            description: data.description || "",
            logo: data.logo || "",
            gstin: data.seller?.gstin || "",
            state: data.seller?.state || "",
          });
          if (data.logo) setLogoUrls([data.logo]);
        setSellerId(data.seller?.sellerId || "");
        setStoreHandle(data.seller?.storeHandle || null);
        setIsLocalStore(data.seller?.isLocalStore ?? false);
        setStoreAddress(data.seller?.storeAddress ?? "");
        setPickupHours(data.seller?.pickupHours ?? "");
        setPickupAcceptsCOD(data.seller?.pickupAcceptsCOD ?? false);
        setSpinWheelEnabled(data.seller?.spinWheelEnabled ?? false);
        setFestivalThemeEnabled(data.seller?.festivalThemeEnabled ?? true);
        const fb = data.seller?.floatingBarConfig;
        if (fb && typeof fb === "object") {
          const cfg = fb as { enabled?: boolean; message?: string; ctaText?: string; ctaLink?: string; backgroundColor?: string; textColor?: string; position?: FloatingBarPosition };
          setFloatingBarEnabled(cfg.enabled ?? false);
          setFloatingBarMessage(cfg.message?.trim() || "Limited-time offers are live");
          setFloatingBarCtaText(cfg.ctaText?.trim() || "Shop now");
          setFloatingBarCtaLink(cfg.ctaLink?.trim() || "");
          setFloatingBarBg(cfg.backgroundColor || "#111827");
          setFloatingBarTextColor(cfg.textColor || "#ffffff");
          setFloatingBarPosition(cfg.position || "bottom-right");
        }
        const sc = data.seller?.shakeConfig;
        if (sc && typeof sc === "object") {
          setShakeEnabled((sc as {enabled?:boolean}).enabled ?? false);
          setShakeType(((sc as {type?:string}).type as ShakeType) ?? "product");
          if ((sc as {product?:ShakeProduct}).product) setShakeProduct((sc as {product:ShakeProduct}).product);
          if ((sc as {category?:string}).category) setShakeCategory((sc as {category:string}).category);
          if ((sc as {message?:{emoji:string;title:string;body:string}}).message) {
            const m = (sc as {message:{emoji:string;title:string;body:string}}).message;
            setShakeMsgEmoji(m.emoji || "🎉"); setShakeMsgTitle(m.title || ""); setShakeMsgBody(m.body || "");
          }
          if ((sc as {banner?:{url:string;link?:string}}).banner) {
            const b = (sc as {banner:{url:string;link?:string}}).banner;
            setShakeBannerUrl(b.url || ""); setShakeBannerLink(b.link || "");
          }
        }
        if (Array.isArray(data.seller?.quickTags)) setQuickTags(data.seller.quickTags);
        if (data.seller?.storeColor) setStoreColor(data.seller.storeColor);
        setProductBgColor(data.seller?.productBgColor || "");
        setStorePaused(data.seller?.storePaused ?? false);
        setStorePausedMsg(data.seller?.storePausedMsg ?? "");
        if (
          data.seller?.spinWheelSegments &&
          Array.isArray(data.seller.spinWheelSegments) &&
          data.seller.spinWheelSegments.length >= 2
        ) {
          setSegments(
            data.seller.spinWheelSegments.map((s: { label: string; code?: string | null; color?: string }) => ({
              label: s.label ?? "",
              code: s.code ?? "",
              color: s.color ?? "#6d28d9",
            }))
          );
        }
      });
    });
    return () => unsubscribe();
  }, [setValue]);

  // If arriving via "#gstin" link (e.g. from the payouts banner), scroll to
  // the GSTIN field on the Store Profile tab and focus it.
  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash !== "#gstin") return;
    const t = setTimeout(() => {
      const el = document.getElementById("gstin");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus();
    }, 400);
    return () => clearTimeout(t);
  }, []);

  // Filled in only after mount, deliberately — the server has no notion of
  // "this browser's host", so guessing it during the initial render would
  // make the server-rendered HTML disagree with the client's first paint
  // (a hydration mismatch). Starting at "" and setting it here means both
  // renders agree, and the store link just upgrades a moment later.
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const handleLogoChange = (urls: string[]) => {
    setLogoUrls(urls);
    setValue("logo", urls[0] || "");
  };

  const onSubmit = async (data: SellerProfileInput) => {
    if (data.gstin && data.gstin.trim() && !GSTIN_REGEX.test(data.gstin.trim().toUpperCase())) {
      toast.error("Enter a valid 15-character GSTIN (e.g. 27ABCDE1234F1Z5).");
      return;
    }
    setLoading(true);
    try {
      const token = auth.currentUser?.uid;
      const res = await fetch("/api/sellers/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Store settings updated!");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const saveLocalStore = async () => {
    setLocalLoading(true);
    try {
      const token = auth.currentUser?.uid;
      const res = await fetch("/api/sellers/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isLocalStore, storeAddress, pickupHours, pickupAcceptsCOD }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Local store settings saved!");
    } catch {
      toast.error("Failed to save local store settings");
    } finally {
      setLocalLoading(false);
    }
  };

  const savePauseStore = async () => {
    setPauseLoading(true);
    try {
      const token = auth.currentUser?.uid;
      const res = await fetch("/api/sellers/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          storePaused,
          storePausedMsg: storePaused ? storePausedMsg.trim() : "",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(storePaused ? "Store paused — customers will see the closed notice." : "Store is back live!");
    } catch {
      toast.error("Failed to save availability settings");
    } finally {
      setPauseLoading(false);
    }
  };

  const addSegment = () => {
    if (segments.length >= 16) return;
    const hue = Math.floor(Math.random() * 360);
    const color = `hsl(${hue},70%,50%)`;
    setSegments((prev) => [...prev, { label: "New Offer", code: "", color }]);
  };

  const removeSegment = (idx: number) => {
    if (segments.length <= 2) return;
    setSegments((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateSegment = (idx: number, field: keyof Segment, value: string) => {
    setSegments((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const saveFeatures = async () => {
    if (segments.length < 2) {
      toast.error("You need at least 2 segments");
      return;
    }
    const invalid = segments.find((s) => !s.label.trim());
    if (invalid) {
      toast.error("All segments must have a label");
      return;
    }
    setFeaturesLoading(true);
    try {
      const token = auth.currentUser?.uid;
      const res = await fetch("/api/sellers/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          spinWheelEnabled,
          festivalThemeEnabled,
          spinWheelSegments: segments.map((s) => ({
            label: s.label.trim(),
            code: s.code.trim() || null,
            color: s.color,
          })),
          floatingBarConfig: {
            enabled: floatingBarEnabled,
            message: floatingBarMessage.trim(),
            ctaText: floatingBarCtaText.trim(),
            ctaLink: floatingBarCtaLink.trim(),
            backgroundColor: floatingBarBg,
            textColor: floatingBarTextColor,
            position: floatingBarPosition,
          },
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Spin Wheel settings saved!");
    } catch {
      toast.error("Failed to save feature settings");
    } finally {
      setFeaturesLoading(false);
    }
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/^#+/, "");
    if (!t || quickTags.includes(t) || quickTags.length >= 20) return;
    setQuickTags(prev => [...prev, t]);
    setTagInput("");
  };

  const loadShakeProducts = () => {
    if (shakeProductsLoaded) return;
    const token = auth.currentUser?.uid ?? (() => { try { return localStorage.getItem("nxc-uid"); } catch { return null; } })();
    fetch("/api/sellers/products", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json())
      .then(data => {
        const prods: ShakeProduct[] = (data.products ?? []).map((p: {id:string;productId:string;name:string;images:string[];price:number;comparePrice?:number;seller?:{sellerId?:string}}) => ({
          id: p.id, productId: p.productId, name: p.name,
          image: p.images?.[0] ?? "", price: p.price, comparePrice: p.comparePrice,
          sellerId: p.seller?.sellerId ?? "",
        }));
        setShakeProducts(prods);
        const cats = Array.from(new Set(prods.map((p) => "").filter(Boolean))) as string[];
        setShakeCategories(cats);
        setShakeProductsLoaded(true);
      })
      .catch(() => {});
  };

  const saveShake = async () => {
    if (shakeType === "product" && !shakeProduct) { toast.error("Please select a product"); return; }
    if (shakeType === "category" && !shakeCategory.trim()) { toast.error("Please enter a category"); return; }
    if (shakeType === "message" && (!shakeMsgTitle.trim() || !shakeMsgBody.trim())) { toast.error("Title and message are required"); return; }
    if (shakeType === "banner" && !shakeBannerUrl.trim()) { toast.error("Please upload a banner image"); return; }
    setShakeLoading(true);
    try {
      const token = auth.currentUser?.uid ?? (() => { try { return localStorage.getItem("nxc-uid"); } catch { return null; } })();
      const config = {
        enabled: shakeEnabled, type: shakeType,
        ...(shakeType === "product" && shakeProduct ? { product: shakeProduct } : {}),
        ...(shakeType === "category" ? { category: shakeCategory.trim() } : {}),
        ...(shakeType === "message" ? { message: { emoji: shakeMsgEmoji, title: shakeMsgTitle.trim(), body: shakeMsgBody.trim() } } : {}),
        ...(shakeType === "banner" ? { banner: { url: shakeBannerUrl, ...(shakeBannerLink.trim() ? { link: shakeBannerLink.trim() } : {}) } } : {}),
      };
      const res = await fetch("/api/sellers/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ shakeConfig: config }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Shake settings saved!");
    } catch { toast.error("Failed to save"); }
    finally { setShakeLoading(false); }
  };

  const saveColor = async (color: string) => {
    setColorSaving(true);
    try {
      const token = auth.currentUser?.uid ?? undefined;
      const res = await fetch("/api/sellers/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ storeColor: color || "" }),
      });
      if (!res.ok) throw new Error("Failed");
      setStoreColor(color);
      toast.success("Page colour saved! Your store page now uses this colour.");
    } catch {
      toast.error("Failed to save colour");
    } finally {
      setColorSaving(false);
    }
  };

  const saveProductBgColor = async (color: string) => {
    setProductBgColorSaving(true);
    try {
      const token = auth.currentUser?.uid ?? undefined;
      const res = await fetch("/api/sellers/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ productBgColor: color || "" }),
      });
      if (!res.ok) throw new Error("Failed");
      setProductBgColor(color);
      toast.success(color ? "Product background colour saved!" : "Product background will now auto-tint from your banner colour.");
    } catch {
      toast.error("Failed to save colour");
    } finally {
      setProductBgColorSaving(false);
    }
  };

  // "My Store" — the seller's live public storefront link. storePath is
  // available as soon as the profile fetch resolves (relative, e.g.
  // "/store/KRISHN001" or "/krishna-store"); fullStoreUrl/displayStoreUrl
  // upgrade to an absolute link once `origin` is filled in client-side.
  const storePath = sellerId ? storeUrlFor({ sellerId, storeHandle }) : "";
  const fullStoreUrl = origin && storePath ? `${origin}${storePath}` : storePath;
  const displayStoreUrl = origin && storePath ? `${origin.replace(/^https?:\/\//, "")}${storePath}` : storePath;

  const copyStoreLink = async () => {
    // Guarded on `origin` too, not just storePath — before the client-side
    // origin effect runs, fullStoreUrl falls back to a bare relative path
    // like "/store/KRISHN001", which is useless once pasted outside the
    // browser. The button is disabled until origin is ready, so this should
    // never actually fire early, but the guard keeps it correct either way.
    if (!origin || !fullStoreUrl) return;
    try {
      await navigator.clipboard.writeText(fullStoreUrl);
      toast.success("Store link copied!");
    } catch {
      toast.error("Couldn't copy — try selecting the link manually.");
    }
  };

  const saveTags = async () => {
    setTagsLoading(true);
    try {
      const token = auth.currentUser?.uid ?? (() => { try { return localStorage.getItem("nxc-uid"); } catch { return null; } })();
      const res = await fetch("/api/sellers/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ quickTags }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Quick search tags saved!");
    } catch {
      toast.error("Failed to save tags");
    } finally {
      setTagsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Link href="/" className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
              <Home className="h-3.5 w-3.5" />
              <span>Home</span>
            </Link>
            <span className="text-muted-foreground/50 text-[12px]">/</span>
            <span className="text-[12px] text-foreground font-medium">Settings</span>
          </div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Manage your store profile</p>
        </div>
        <Link href="/">
          <button className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-sm">
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Home</span>
          </button>
        </Link>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Store Profile</TabsTrigger>
          <TabsTrigger value="local">Local Store</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="features">Store Features</TabsTrigger>
          <TabsTrigger value="tags">Quick Tags</TabsTrigger>
          <TabsTrigger value="shake" onClick={loadShakeProducts}>Shake</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          {/* ── My Store ── */}
          <div className="mb-6 max-w-3xl rounded-xl border border-border/50 p-5 space-y-4">
            <div>
              <h2 className="font-medium flex items-center gap-2">
                <Store className="h-4 w-4" /> My Store
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                This is exactly what customers see when they visit your store.
              </p>
            </div>

            {storePath ? (
              <>
                <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
                  <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-[13px] font-mono truncate flex-1" title={fullStoreUrl}>
                    {displayStoreUrl}
                  </span>
                  <button
                    type="button"
                    onClick={copyStoreLink}
                    disabled={!origin}
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none"
                    aria-label="Copy store link"
                    title="Copy link"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                {/* Deliberately a plain <a>, not next/link's Link — a client-side
                    SPA transition can serve an already-cached render of the
                    storefront from Next's Router Cache, which would still show
                    whatever colour was live BEFORE this save. A hard navigation
                    always asks the server fresh, so it always reflects what was
                    just saved (same reasoning as the sidebar's "My Store" link). */}
                <Button asChild size="sm">
                  <a href={storePath}>
                    <ExternalLink className="h-3.5 w-3.5" /> View My Store
                  </a>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Loading your store link…</p>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-xl">
            <div className="rounded-xl border border-border/50 p-5 space-y-4">
              <h2 className="font-medium">Store Information</h2>
              <div className="space-y-1.5">
                <Label htmlFor="storeName">Store Name *</Label>
                <Input
                  id="storeName"
                  value={storeNameValue}
                  onChange={e => { setStoreNameValue(e.target.value); setValue("storeName", e.target.value); }}
                  placeholder="Your Store Name"
                />
                {errors.storeName && <p className="text-xs text-destructive">{errors.storeName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...register("description")} rows={3} placeholder="Tell customers about your store..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gstin">GSTIN <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  id="gstin"
                  className="uppercase"
                  maxLength={15}
                  placeholder="e.g. 27ABCDE1234F1Z5"
                  {...register("gstin")}
                />
                <p className="text-xs text-muted-foreground">
                  Required before you can request a payout from your wallet.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state">Business State <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <select
                  id="state"
                  {...register("state")}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Used to calculate CGST/SGST vs IGST on customer invoices.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/50 p-5 space-y-4">
              <div>
                <h2 className="font-medium">Store Logo</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Square image recommended · shown in your storefront header</p>
              </div>
              <ImageUpload
                value={logoUrls}
                onChange={handleLogoChange}
                maxImages={1}
                folder="nexcart/logos"
                authToken={auth.currentUser?.uid}
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </form>

          {/* ── Page Colour ── */}
          <div className="mt-6 max-w-3xl rounded-xl border border-border/50 p-5 space-y-6">
            <div>
              <h2 className="font-medium flex items-center gap-2">
                <Palette className="h-4 w-4" /> Page Colour
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Choose the main colour for your store page — header, buttons, and accents all change. Pick a flat colour, a curated gradient, or mix your own for a premium, one-of-a-kind storefront. Customers see this on your public store.
              </p>
            </div>
            <ColorPickerSection
              value={storeColor}
              onApply={saveColor}
              saving={colorSaving}
              renderPreview={(bg, textColor, badgeBg) => {
                // Product cards no longer take any seller colour override —
                // they always render on a plain neutral background, so the
                // mockup's card half stays fixed regardless of the banner
                // colour being dragged here.
                // Page background: a saved Product Background Colour wins,
                // full strength; otherwise "auto" matches the banner colour
                // being dragged here exactly, not a faded tint.
                return (
                  <MiniStorePreview
                    storeName={storeNameValue}
                    bannerBg={bg}
                    bannerTextColor={textColor}
                    bannerBadgeBg={badgeBg}
                    cardBg="#ffffff"
                    cardTextColor="#18181b"
                    pageBg={resolvePageBg(productBgColor, bg)}
                  />
                );
              }}
            />
            <p className="text-[11px] text-muted-foreground">
              Changes apply immediately to your public store page.
            </p>
          </div>

          {/* ── Product Background Colour ── */}
          <div className="mt-6 max-w-3xl rounded-xl border border-border/50 p-5 space-y-6">
            <div>
              <h2 className="font-medium flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" /> Product Background Colour
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                The page background behind your whole product grid — the area around your banner&apos;s category row, sale strips, and product cards. Independent from your Page Colour and Product Card Back Colour above.
              </p>
            </div>

            {/* Auto vs custom toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => productBgColor && saveProductBgColor("")}
                disabled={productBgColorSaving}
                className={`flex-1 rounded-lg border px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${!productBgColor ? "border-foreground/60 bg-muted" : "border-border hover:border-foreground/30"}`}
              >
                Auto (based on banner)
                <span className="block text-[11px] font-normal text-muted-foreground mt-0.5">Automatically tints your banner colour at low opacity — no need to choose anything</span>
              </button>
              <button
                type="button"
                onClick={() => !productBgColor && saveProductBgColor(storeColor || "#16a34a")}
                disabled={productBgColorSaving}
                className={`flex-1 rounded-lg border px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${productBgColor ? "border-foreground/60 bg-muted" : "border-border hover:border-foreground/30"}`}
              >
                Choose a different colour
                <span className="block text-[11px] font-normal text-muted-foreground mt-0.5">Pick an independent background colour, shown full strength</span>
              </button>
            </div>

            {productBgColor && (
              <ColorPickerSection
                value={productBgColor}
                onApply={saveProductBgColor}
                saving={productBgColorSaving}
                searchPlaceholder={`Search colours — a name like "Rose Gold" or a hex like #870000…`}
                fallbackColor={storeColor || "#16a34a"}
                renderPreview={(bg, textColor) => {
                  // Banner half always reflects the currently-applied banner
                  // colour — editing the page background never changes it.
                  // Product cards no longer take any colour override, so
                  // the card half stays a fixed neutral regardless.
                  const bannerHalf = resolvePreviewColors(storeColor, "#16a34a");
                  return (
                    <MiniStorePreview
                      storeName={storeNameValue}
                      bannerBg={bannerHalf.bg}
                      bannerTextColor={bannerHalf.textColor}
                      bannerBadgeBg={bannerHalf.badgeBg}
                      cardBg="#ffffff"
                      cardTextColor="#18181b"
                      pageBg={bg}
                    />
                  );
                }}
              />
            )}

            <p className="text-[11px] text-muted-foreground">
              Changes apply immediately to your public store page.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="local">
          <div className="max-w-xl space-y-5">
            <div className="rounded-xl border border-border/50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Store className="h-4 w-4 text-primary" />
                    <h2 className="font-medium">Local / Kirana Store Mode</h2>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Enable this if you run a physical shop where customers come to collect their orders. Your products will not appear on the main marketplace.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLocalStore((v) => !v)}
                  className="shrink-0 mt-0.5"
                  aria-label="Toggle local store"
                >
                  {isLocalStore
                    ? <ToggleRight className="h-8 w-8 text-primary" />
                    : <ToggleLeft className="h-8 w-8 text-muted-foreground" />}
                </button>
              </div>

              {isLocalStore && (
                <div className="mt-4 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <p className="text-xs font-medium text-primary">Local Store Mode is ON — customers can place pickup orders from your store page.</p>
                </div>
              )}
            </div>

            {isLocalStore && (
              <>
                <div className="rounded-xl border border-border/50 p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <h2 className="font-medium">Store Address</h2>
                  </div>
                  <p className="text-xs text-muted-foreground -mt-2">
                    This address is shown to customers when they place a pickup order.
                  </p>
                  <textarea
                    value={storeAddress}
                    onChange={(e) => setStoreAddress(e.target.value)}
                    rows={3}
                    placeholder="e.g. Kittu Kiranam, Main Road, Near Temple, Palakol Village, West Godavari - 534260"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>

                <div className="rounded-xl border border-border/50 p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <h2 className="font-medium">Pickup Hours</h2>
                  </div>
                  <p className="text-xs text-muted-foreground -mt-2">
                    Tell customers when they can come to collect their orders.
                  </p>
                  <input
                    type="text"
                    value={pickupHours}
                    onChange={(e) => setPickupHours(e.target.value)}
                    placeholder="e.g. Mon–Sat: 8am–9pm, Sun: 9am–1pm"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="rounded-xl border border-border/50 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-medium">Accept Cash on Delivery (COD)</h2>
                      <p className="text-xs text-muted-foreground mt-1">
                        Allow customers to choose &quot;Pay at store (COD)&quot; at checkout. If disabled, customers must pay online before pickup.
                      </p>
                      {pickupAcceptsCOD && (
                        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/10 px-3 py-2">
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            ⚠️ COD is enabled. Customers may place orders and not show up — you&apos;ll pack for nothing. Consider Online-only to avoid misuse.
                          </p>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPickupAcceptsCOD((v) => !v)}
                      className="shrink-0 mt-0.5"
                      aria-label="Toggle COD"
                    >
                      {pickupAcceptsCOD
                        ? <ToggleRight className="h-8 w-8 text-amber-500" />
                        : <ToggleLeft className="h-8 w-8 text-muted-foreground" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <Button onClick={saveLocalStore} disabled={localLoading}>
              {localLoading ? "Saving..." : "Save Local Store Settings"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="availability">
          <div className="max-w-xl space-y-5">
            <div className="rounded-xl border border-border/50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    {storePaused ? <PauseCircle className="h-4 w-4 text-destructive" /> : <PlayCircle className="h-4 w-4 text-primary" />}
                    <h2 className="font-medium">Store Availability</h2>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pause your store before adding flash sale products so customers cannot buy them early. While paused, visitors see a &quot;temporarily closed&quot; notice instead of your store.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStorePaused((v) => !v)}
                  className="shrink-0 mt-0.5"
                  aria-label="Toggle store availability"
                >
                  {storePaused
                    ? <ToggleRight className="h-8 w-8 text-destructive" />
                    : <ToggleLeft className="h-8 w-8 text-muted-foreground" />}
                </button>
              </div>

              {storePaused ? (
                <div className="mt-4 rounded-lg bg-destructive/8 border border-destructive/25 px-4 py-3 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                  <p className="text-xs font-medium text-destructive">Store is PAUSED — customers visiting your store will see the closed notice below.</p>
                </div>
              ) : (
                <div className="mt-4 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <p className="text-xs font-medium text-primary">Store is LIVE — customers can browse and buy normally.</p>
                </div>
              )}
            </div>

            {storePaused && (
              <div className="rounded-xl border border-border/50 p-5 space-y-3">
                <h2 className="font-medium text-sm">Message for Customers</h2>
                <p className="text-xs text-muted-foreground -mt-1">
                  Tell customers when you will be back — they see this on your store page.
                </p>
                <input
                  type="text"
                  value={storePausedMsg}
                  onChange={(e) => setStorePausedMsg(e.target.value)}
                  maxLength={120}
                  placeholder="e.g. We will be back in 2 hours with exciting flash sale offers!"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-[11px] text-muted-foreground">{storePausedMsg.length}/120 characters · Leave blank to show a default message.</p>
              </div>
            )}

            <Button onClick={savePauseStore} disabled={pauseLoading} variant={storePaused ? "destructive" : "default"}>
              {pauseLoading ? "Saving..." : storePaused ? "Confirm Pause Store" : "Save — Go Live"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="features">
          <div className="max-w-2xl space-y-5">
            {/* Enable / Disable toggle */}
            <div className="rounded-xl border border-border/50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Gift className="h-4 w-4 text-primary" />
                    <h2 className="font-medium">Spin the Wheel</h2>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Show a fun spin-to-win discount wheel to first-time visitors of your store. Helps convert new visitors into buyers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSpinWheelEnabled((v) => !v)}
                  className="shrink-0 mt-0.5"
                  aria-label="Toggle spin wheel"
                >
                  {spinWheelEnabled
                    ? <ToggleRight className="h-8 w-8 text-primary" />
                    : <ToggleLeft className="h-8 w-8 text-muted-foreground" />}
                </button>
              </div>
              {spinWheelEnabled && (
                <div className="mt-4 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <p className="text-xs font-medium text-primary">
                    Spin the Wheel is ON — first-time visitors will see the wheel after 2.5 seconds.
                  </p>
                </div>
              )}
            </div>

            {/* Segment editor */}
            <div className="rounded-xl border border-border/50 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-medium">Wheel Segments</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Customise exactly what each slice of the wheel shows. Add up to 16 segments.
                  </p>
                </div>
                <span className="text-xs text-muted-foreground font-mono">{segments.length}/16</span>
              </div>

              {/* Live wheel preview */}
              <div className="flex justify-center py-2">
                <div className="relative w-40 h-40">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
                    <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[16px] border-t-red-500 drop-shadow" />
                  </div>
                  <svg viewBox="0 0 200 200" className="w-full h-full rounded-full shadow-lg border-4 border-white dark:border-gray-700">
                    {segments.map((seg, i) => {
                      const count = segments.length;
                      const angle = (2 * Math.PI) / count;
                      const start = i * angle - Math.PI / 2;
                      const end = (i + 1) * angle - Math.PI / 2;
                      const x1 = 100 + 98 * Math.cos(start);
                      const y1 = 100 + 98 * Math.sin(start);
                      const x2 = 100 + 98 * Math.cos(end);
                      const y2 = 100 + 98 * Math.sin(end);
                      const mid = (start + end) / 2;
                      const tx = 100 + 66 * Math.cos(mid);
                      const ty = 100 + 66 * Math.sin(mid);
                      const rot = (mid * 180 / Math.PI) + 90;
                      return (
                        <g key={i}>
                          <path d={`M 100 100 L ${x1} ${y1} A 98 98 0 0 1 ${x2} ${y2} Z`} fill={seg.color || "#94a3b8"} stroke="white" strokeWidth="1.5" />
                          <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="8" fontWeight="bold" transform={`rotate(${rot},${tx},${ty})`}>
                            {seg.label.slice(0, 8)}
                          </text>
                        </g>
                      );
                    })}
                    <circle cx="100" cy="100" r="16" fill="white" />
                    <circle cx="100" cy="100" r="13" fill="#1f2937" />
                  </svg>
                </div>
              </div>

              {/* Segment rows */}
              <div className="space-y-2.5">
                {segments.map((seg, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
                    {/* Color picker */}
                    <div className="relative shrink-0">
                      <input
                        type="color"
                        value={seg.color}
                        onChange={(e) => updateSegment(idx, "color", e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        title="Pick segment color"
                      />
                      <div
                        className="w-8 h-8 rounded-lg border-2 border-white shadow-sm cursor-pointer"
                        style={{ background: seg.color }}
                      />
                    </div>

                    {/* Label */}
                    <input
                      type="text"
                      value={seg.label}
                      onChange={(e) => updateSegment(idx, "label", e.target.value)}
                      maxLength={20}
                      placeholder="Label (e.g. 10% OFF)"
                      className="flex-1 min-w-0 rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />

                    {/* Coupon code */}
                    <input
                      type="text"
                      value={seg.code}
                      onChange={(e) => updateSegment(idx, "code", e.target.value.toUpperCase())}
                      maxLength={20}
                      placeholder="Code (optional)"
                      className="w-28 shrink-0 rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeSegment(idx)}
                      disabled={segments.length <= 2}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30"
                      aria-label="Remove segment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add segment */}
              <button
                type="button"
                onClick={addSegment}
                disabled={segments.length >= 16}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
                Add Segment
              </button>

              <p className="text-[11px] text-muted-foreground">
                Segments with no coupon code are shown as &quot;Try Again&quot; — customer gets nothing but can browse your store.
              </p>
            </div>

            {/* Festival Auto-Theme toggle */}
            <div className="rounded-xl border border-border/50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-lg">🪔</span>
                    <h2 className="font-medium">Festival Auto-Theme</h2>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your store banner automatically gets festival decorations during Diwali, Pongal, Holi, Onam, Christmas and more Indian festivals — floating emojis, festive overlay, and a festival badge on your store header.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {["🪔 Diwali","🌾 Pongal","🎨 Holi","💃 Navratri","🌸 Onam","🎄 Christmas","🎆 New Year","🇮🇳 Independence Day"].map(f => (
                      <span key={f} className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium">{f}</span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFestivalThemeEnabled(v => !v)}
                  className="shrink-0 mt-0.5"
                  aria-label="Toggle festival theme"
                >
                  {festivalThemeEnabled
                    ? <ToggleRight className="h-8 w-8 text-primary" />
                    : <ToggleLeft className="h-8 w-8 text-muted-foreground" />}
                </button>
              </div>
              {festivalThemeEnabled && (
                <div className="mt-4 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <p className="text-xs font-medium text-primary">Festival theme is ON — your store will auto-decorate during Indian festivals.</p>
                </div>
              )}
            </div>

            {/* Floating promotional bar */}
            <div className="rounded-xl border border-border/50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-lg">📢</span>
                    <h2 className="font-medium">Floating Promo Bar</h2>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Show a premium floating bar on your store page with a short message and CTA that stays visible while customers browse.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFloatingBarEnabled(v => !v)}
                  className="shrink-0 mt-0.5"
                  aria-label="Toggle floating promo bar"
                >
                  {floatingBarEnabled
                    ? <ToggleRight className="h-8 w-8 text-primary" />
                    : <ToggleLeft className="h-8 w-8 text-muted-foreground" />}
                </button>
              </div>

              {floatingBarEnabled && (
                <div className="mt-4 space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="space-y-1.5">
                    <Label>Message</Label>
                    <Textarea
                      value={floatingBarMessage}
                      onChange={(e) => setFloatingBarMessage(e.target.value)}
                      maxLength={140}
                      placeholder="Flash sale is live — grab it before it ends"
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>CTA text</Label>
                      <Input value={floatingBarCtaText} onChange={(e) => setFloatingBarCtaText(e.target.value)} maxLength={30} placeholder="Shop now" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>CTA link</Label>
                      <Input type="url" value={floatingBarCtaLink} onChange={(e) => setFloatingBarCtaLink(e.target.value)} placeholder="https://example.com" />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label>Background</Label>
                      <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-2.5 py-2">
                        <input type="color" value={floatingBarBg} onChange={(e) => setFloatingBarBg(e.target.value)} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0" />
                        <span className="text-sm font-mono">{floatingBarBg}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Text color</Label>
                      <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-2.5 py-2">
                        <input type="color" value={floatingBarTextColor} onChange={(e) => setFloatingBarTextColor(e.target.value)} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0" />
                        <span className="text-sm font-mono">{floatingBarTextColor}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Position</Label>
                      <select
                        value={floatingBarPosition}
                        onChange={(e) => setFloatingBarPosition(e.target.value as FloatingBarPosition)}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="top-left">Top left</option>
                        <option value="top-center">Top center</option>
                        <option value="top-right">Top right</option>
                        <option value="bottom-left">Bottom left</option>
                        <option value="bottom-center">Bottom center</option>
                        <option value="bottom-right">Bottom right</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button onClick={saveFeatures} disabled={featuresLoading}>
              {featuresLoading ? "Saving..." : "Save Feature Settings"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="tags">
          <div className="max-w-xl space-y-5">
            <div className="rounded-xl border border-border/50 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-primary" />
                <h2 className="font-medium">Quick Search Tags</h2>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Add tags that appear as clickable pills on your store page. Customers tap them to instantly search your products — great for promoting new arrivals, sales, or popular categories.
              </p>

              {/* Input row */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">#</span>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value.replace(/^#+/, ""))}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                    maxLength={40}
                    placeholder="mango pickle, sale, new arrivals…"
                    className="w-full rounded-lg border border-input bg-background pl-7 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <Button type="button" onClick={addTag} disabled={!tagInput.trim() || quickTags.length >= 20} size="sm" className="gap-1.5 shrink-0">
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>

              {/* Tag chips */}
              {quickTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {quickTags.map(tag => (
                    <span key={tag} className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 pl-3 pr-2 py-1 text-[12px] font-medium">
                      #{tag}
                      <button
                        type="button"
                        onClick={() => setQuickTags(prev => prev.filter(t => t !== tag))}
                        className="rounded-full p-0.5 hover:bg-destructive/15 hover:text-destructive transition-colors"
                        aria-label={`Remove ${tag}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No tags yet — add some above.</p>
              )}

              <p className="text-[11px] text-muted-foreground">{quickTags.length}/20 tags · Press Enter or click Add</p>
            </div>

            {/* Live preview */}
            {quickTags.length > 0 && (
              <div className="rounded-xl border border-border/50 p-4 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Preview on store</p>
                <div className="flex flex-wrap gap-2">
                  {quickTags.map(tag => (
                    <span key={tag} className="rounded-full border px-3 py-1 text-[11px] font-medium bg-primary/8 border-primary/30 text-primary">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={saveTags} disabled={tagsLoading}>
              {tagsLoading ? "Saving…" : "Save Quick Tags"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="shake">
          <div className="max-w-xl space-y-5">
            {/* Enable toggle */}
            <div className="rounded-xl border border-border/50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-lg">📳</span>
                    <h2 className="font-medium">Shake to Discover</h2>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    When a customer shakes their phone on your store, a popup appears showing whatever you configure below — a product, a category, a message, or a banner.
                  </p>
                </div>
                <button type="button" onClick={() => setShakeEnabled(v => !v)} className="shrink-0 mt-0.5">
                  {shakeEnabled ? <ToggleRight className="h-8 w-8 text-primary" /> : <ToggleLeft className="h-8 w-8 text-muted-foreground" />}
                </button>
              </div>
              {shakeEnabled && (
                <div className="mt-4 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <p className="text-xs font-medium text-primary">Shake is ON — customers see a popup when they shake their phone on your store.</p>
                </div>
              )}
            </div>

            {/* What to show */}
            <div className="rounded-xl border border-border/50 p-5 space-y-4">
              <h2 className="font-medium">What shows when customer shakes?</h2>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key:"product", icon:"🛍️", label:"A Product" },
                  { key:"category", icon:"🏷️", label:"A Category" },
                  { key:"message", icon:"💬", label:"A Message" },
                  { key:"banner", icon:"🖼️", label:"A Banner" },
                ] as {key:ShakeType;icon:string;label:string}[]).map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setShakeType(opt.key)}
                    className={`flex items-center gap-2.5 rounded-xl border p-3 text-left text-[13px] font-medium transition-all ${shakeType === opt.key ? "border-primary bg-primary/8 text-primary" : "border-border/60 hover:border-border"}`}
                  >
                    <span className="text-xl">{opt.icon}</span>{opt.label}
                  </button>
                ))}
              </div>

              {/* Product picker */}
              {shakeType === "product" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Select which product to highlight when customer shakes:</p>
                  <select
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={shakeProduct?.id ?? ""}
                    onChange={e => {
                      const p = shakeProducts.find(p => p.id === e.target.value) ?? null;
                      setShakeProduct(p);
                    }}
                  >
                    <option value="">— Select a product —</option>
                    {shakeProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ₹{p.price.toLocaleString("en-IN")}
                      </option>
                    ))}
                  </select>
                  {shakeProduct && (
                    <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                      {shakeProduct.image && <img src={shakeProduct.image} alt={shakeProduct.name} className="h-12 w-12 rounded-lg object-contain bg-white border border-border/40" />}
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold truncate">{shakeProduct.name}</p>
                        <p className="text-[12px] text-muted-foreground">₹{shakeProduct.price.toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Category picker */}
              {shakeType === "category" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Type the category name to filter products when customer shakes:</p>
                  <input
                    type="text"
                    value={shakeCategory}
                    onChange={e => setShakeCategory(e.target.value)}
                    placeholder="e.g. Pickles, Electronics, Sweets..."
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}

              {/* Message config */}
              {shakeType === "message" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Write a custom message — announcement, offer, greeting, anything:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shakeMsgEmoji}
                      onChange={e => setShakeMsgEmoji(e.target.value)}
                      maxLength={2}
                      placeholder="🎉"
                      className="w-14 shrink-0 rounded-lg border border-input bg-background px-3 py-2 text-center text-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="text"
                      value={shakeMsgTitle}
                      onChange={e => setShakeMsgTitle(e.target.value)}
                      maxLength={50}
                      placeholder="Title (e.g. Flash Sale Today!)"
                      className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <textarea
                    value={shakeMsgBody}
                    onChange={e => setShakeMsgBody(e.target.value)}
                    maxLength={200}
                    rows={3}
                    placeholder="Your message to customers... (e.g. Get 20% off all pickles today only! Use code SHAKE20)"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>
              )}

              {/* Banner config */}
              {shakeType === "banner" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Upload a promotional banner image — shown full-width when customer shakes:</p>
                  <ImageUpload
                    value={shakeBannerUrl ? [shakeBannerUrl] : []}
                    onChange={urls => setShakeBannerUrl(urls[0] ?? "")}
                    maxImages={1}
                    folder="nexcart/shake-banners"
                    authToken={auth.currentUser?.uid}
                  />
                  <input
                    type="text"
                    value={shakeBannerLink}
                    onChange={e => setShakeBannerLink(e.target.value)}
                    placeholder="Optional link when banner is tapped (e.g. https://...)"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}
            </div>

            <Button onClick={saveShake} disabled={shakeLoading}>
              {shakeLoading ? "Saving…" : "Save Shake Settings"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
