"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  ShoppingCart, Search, Heart, ChevronDown, Menu, X,
  User2, Package, LogOut, MapPin, Bell, Store, Flame,
  Sparkles, Tag, ChevronRight, ArrowLeft, Clock,
} from "lucide-react";
import { useCartStore, useUIStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils";
import dynamic from "next/dynamic";
import { NotificationBell, NotificationBellMobile } from "@/components/shared/NotificationBell";

const NotificationBellClient = dynamic(
  () => import("@/components/shared/NotificationBell").then((mod) => ({ default: mod.NotificationBell })),
  { ssr: false }
);

const NotificationBellMobileClient = dynamic(
  () => import("@/components/shared/NotificationBell").then((mod) => ({ default: mod.NotificationBellMobile })),
  { ssr: false }
);

// ─── Data ────────────────────────────────────────────────────────────────────

const toSlug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

// Maps Navbar display names → actual DB category slugs
const CAT_SLUG: Record<string, string> = {
  "Home & Living": "home-kitchen",
  "Sports": "sports-fitness",
  "Beauty": "beauty",
  "Toys": "toys-games",
  "Garden": "garden-outdoors",
};
const getSlug = (name: string) => CAT_SLUG[name] ?? toSlug(name);

const CATS = [
  "Electronics", "Fashion", "Home & Living", "Books",
  "Sports", "Beauty", "Toys", "Automotive", "Groceries", "Garden",
];

const MEGA: Record<string, {
  subcats: string[];
  brands: string[];
  promoColor: string;
  promoText: string;
}> = {
  Electronics: {
    subcats: ["Smartphones", "Laptops & PCs", "Tablets", "Cameras", "Audio & Headphones", "Smart Watches"],
    brands: ["Samsung", "Apple", "Sony", "Boat"],
    promoColor: "from-blue-600 to-blue-800",
    promoText: "Latest Gadgets",
  },
  Fashion: {
    subcats: ["Men's Clothing", "Women's Clothing", "Kids' Wear", "Footwear", "Bags & Wallets", "Sunglasses"],
    brands: ["Nike", "Levis", "H&M", "Puma"],
    promoColor: "from-pink-500 to-rose-700",
    promoText: "Trending Styles",
  },
  "Home & Living": {
    subcats: ["Furniture", "Kitchen & Dining", "Bedding & Pillows", "Lighting", "Wall Décor", "Storage & Organizers"],
    brands: ["IKEA", "Pepperfry", "HomeTown", "Godrej"],
    promoColor: "from-amber-500 to-orange-700",
    promoText: "Home Makeover",
  },
  Books: {
    subcats: ["Fiction", "Non-Fiction", "Self Help", "Children's Books", "Textbooks", "Comics & Graphic Novels"],
    brands: ["Penguin", "Harper Collins", "Scholastic", "Rupa"],
    promoColor: "from-emerald-600 to-teal-800",
    promoText: "Top Reads",
  },
  Sports: {
    subcats: ["Cricket", "Football", "Badminton", "Gym & Fitness", "Cycling", "Swimming"],
    brands: ["Cosco", "Nivia", "Decathlon", "Nike"],
    promoColor: "from-sky-500 to-blue-700",
    promoText: "Play Hard",
  },
  Beauty: {
    subcats: ["Skin Care", "Hair Care", "Makeup", "Fragrances", "Men's Grooming", "Nail Care"],
    brands: ["Lakme", "Maybelline", "Dove", "Himalaya"],
    promoColor: "from-purple-500 to-fuchsia-700",
    promoText: "Glow Up",
  },
  Toys: {
    subcats: ["Action Figures", "Board Games", "Learning Toys", "Remote Control", "Dolls", "Outdoor Play"],
    brands: ["Lego", "Hasbro", "Funskool", "Mattel"],
    promoColor: "from-yellow-400 to-orange-500",
    promoText: "Fun for All Ages",
  },
  Automotive: {
    subcats: ["Car Accessories", "Bike Accessories", "Car Care", "Tools & Equipment", "Helmets", "GPS & Trackers"],
    brands: ["Bosch", "3M", "Michelin", "Vega"],
    promoColor: "from-slate-600 to-gray-800",
    promoText: "Drive Better",
  },
  Groceries: {
    subcats: ["Fruits & Vegetables", "Dairy & Eggs", "Snacks & Beverages", "Staples & Grains", "Organic Foods", "Instant Foods"],
    brands: ["Amul", "Nestle", "Tata", "ITC"],
    promoColor: "from-lime-500 to-green-700",
    promoText: "Fresh Daily",
  },
  Garden: {
    subcats: ["Seeds & Bulbs", "Pots & Planters", "Garden Tools", "Soil & Fertilizers", "Outdoor Furniture", "Irrigation"],
    brands: ["Ugaoo", "Kraft Seeds", "Gardenia", "Nurserylive"],
    promoColor: "from-green-500 to-emerald-800",
    promoText: "Green Living",
  },
};

// Per-category accent colors — used for the category strip hover state and
// shared with product cards (seller name link color in per-category sections)
const CATEGORY_ACCENTS: Record<string, string> = {
  "Electronics":   "#2563eb", // blue
  "Fashion":       "#db2777", // pink
  "Home & Living": "#d97706", // amber
  "Books":         "#059669", // emerald
  "Sports":        "#0284c7", // sky
  "Beauty":        "#9333ea", // purple
  "Toys":          "#ca8a04", // yellow
  "Automotive":    "#475569", // slate
  "Groceries":     "#65a30d", // lime
  "Garden":        "#16a34a", // green
};

const CAT_COLORS: Record<string, { base: string; hover: string }> = {
  "Electronics":   { base: "bg-blue-100 text-blue-700",     hover: "hover:bg-blue-600 hover:text-white" },
  "Fashion":       { base: "bg-pink-100 text-pink-700",     hover: "hover:bg-pink-500 hover:text-white" },
  "Home & Living": { base: "bg-amber-100 text-amber-700",   hover: "hover:bg-amber-500 hover:text-white" },
  "Books":         { base: "bg-emerald-100 text-emerald-700", hover: "hover:bg-emerald-600 hover:text-white" },
  "Sports":        { base: "bg-sky-100 text-sky-700",       hover: "hover:bg-sky-500 hover:text-white" },
  "Beauty":        { base: "bg-purple-100 text-purple-700", hover: "hover:bg-purple-500 hover:text-white" },
  "Toys":          { base: "bg-yellow-100 text-yellow-700", hover: "hover:bg-yellow-500 hover:text-white" },
  "Automotive":    { base: "bg-slate-100 text-slate-700",   hover: "hover:bg-slate-600 hover:text-white" },
  "Groceries":     { base: "bg-lime-100 text-lime-700",     hover: "hover:bg-lime-600 hover:text-white" },
  "Garden":        { base: "bg-green-100 text-green-700",   hover: "hover:bg-green-600 hover:text-white" },
};


const TRENDING = ["iPhone 15", "Nike Shoes", "Kurta Set", "Sony Headphones", "MacBook Air", "Dinner Set"];

// Bolds the substring of `text` that matches `query` (case-insensitive) —
// the way Flipkart/Amazon bold the typed portion inside suggestion rows.
function highlightMatch(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-bold">{text.slice(idx, idx + q.length)}</span>
      {text.slice(idx + q.length)}
    </>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  // Auth
  const [user, setUser] = useState<User | null>(null);

  // Search
  const [q, setQ] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedCat, setSelectedCat] = useState("All Categories");
  const [catDropOpen, setCatDropOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const catDropRef = useRef<HTMLDivElement>(null);

  // Live, debounced, API-backed autocomplete (real products/sellers/categories
  // from /api/search/autocomplete — this platform is too large for a client
  // array, unlike the per-seller store search) — plus keyboard nav and a
  // small persisted search history, the pieces that make it feel like a real
  // e-commerce search bar instead of a plain text filter.
  const [liveSuggestions, setLiveSuggestions] = useState<Array<{
    type: "product" | "category" | "seller";
    id: string;
    title: string;
    subtitle: string;
    image: string | null;
  }>>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const suggestFetchIdRef = useRef(0);

  // Account dropdown
  const [acctOpen, setAcctOpen] = useState(false);
  const acctRef = useRef<HTMLDivElement>(null);

  // Location modal
  const [locOpen, setLocOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pincode] = useState("110001");
  const [city] = useState("Delhi");

  // Mega menu
  const [megaCat, setMegaCat] = useState<string | null>(null);
  const megaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mobile drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Mobile search overlay
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileQ, setMobileQ] = useState("");
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Scroll shadow
  const [elevated, setElevated] = useState(false);

  // Hydration fix: defer cart values until client is mounted
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Cart
  const _totalItems = useCartStore((s) => s.getTotalItems());
  const _totalPrice = useCartStore((s) => s.getTotalPrice());
  const totalItems = mounted ? _totalItems : 0;
  const totalPrice = mounted ? _totalPrice : 0;

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return unsub;
  }, []);

  useEffect(() => {
    const fn = () => setElevated(window.scrollY > 2);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Close search suggestions on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) setSearchFocused(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // Close cat dropdown on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (!catDropRef.current?.contains(e.target as Node)) setCatDropOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // Close account dropdown on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (!acctRef.current?.contains(e.target as Node)) setAcctOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  // Load persisted search history once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("nxc-recent-search-global");
      if (raw) setRecentSearches(JSON.parse(raw));
    } catch {}
  }, []);

  const saveRecentSearch = useCallback((term: string) => {
    const t = term.trim();
    if (!t) return;
    setRecentSearches(prev => {
      const next = [t, ...prev.filter(s => s.toLowerCase() !== t.toLowerCase())].slice(0, 8);
      try { localStorage.setItem("nxc-recent-search-global", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const removeRecentSearch = useCallback((term: string) => {
    setRecentSearches(prev => {
      const next = prev.filter(s => s !== term);
      try { localStorage.setItem("nxc-recent-search-global", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // Debounced fetch against the real, platform-wide autocomplete API
  // (products + categories + sellers). A monotonically increasing request id
  // guards against a slow earlier response clobbering a faster later one.
  const runSuggestFetch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setLiveSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }
    const fetchId = ++suggestFetchIdRef.current;
    setSuggestionsLoading(true);
    fetch(`/api/search/autocomplete?q=${encodeURIComponent(trimmed)}`)
      .then(r => r.json())
      .then(data => {
        if (fetchId !== suggestFetchIdRef.current) return; // stale response
        setLiveSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
      })
      .catch(() => { if (fetchId === suggestFetchIdRef.current) setLiveSuggestions([]); })
      .finally(() => { if (fetchId === suggestFetchIdRef.current) setSuggestionsLoading(false); });
  }, []);

  useEffect(() => {
    setActiveSuggestionIdx(-1);
    const handle = setTimeout(() => runSuggestFetch(q), 300);
    return () => clearTimeout(handle);
  }, [q, runSuggestFetch]);

  useEffect(() => {
    setActiveSuggestionIdx(-1);
    const handle = setTimeout(() => runSuggestFetch(mobileQ), 300);
    return () => clearTimeout(handle);
  }, [mobileQ, runSuggestFetch]);

  // Navigates to the right destination for a suggestion type and records it
  const goToSuggestion = useCallback((s: { type: "product" | "category" | "seller"; id: string; title: string }, searchTermUsed: string) => {
    saveRecentSearch(searchTermUsed || s.title);
    if (s.type === "product") router.push(`/product/${s.id}`);
    else if (s.type === "seller") router.push(`/store/${s.id}`);
    else router.push(`/categories/${s.id}`);
  }, [router, saveRecentSearch]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  // Seller ID pattern: uppercase letters + digits, 4-12 chars (e.g. TECH001, SELLER123)
  const SELLER_ID_REGEX = /^[A-Z]{2,8}\d{1,6}$/;

  const isSellerIdQuery = (val: string) => SELLER_ID_REGEX.test(val.trim().toUpperCase());

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) {
      const trimmed = q.trim();
      saveRecentSearch(trimmed);
      if (isSellerIdQuery(trimmed)) {
        router.push(`/store/${trimmed.toUpperCase()}`);
      } else {
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      }
      setQ("");
      setSearchFocused(false);
      setActiveSuggestionIdx(-1);
    }
  };

  const handleMegaEnter = (cat: string) => {
    if (megaTimer.current) clearTimeout(megaTimer.current);
    setMegaCat(cat);
  };

  const handleMegaLeave = () => {
    megaTimer.current = setTimeout(() => setMegaCat(null), 150);
  };

  const handleMegaContentEnter = () => {
    if (megaTimer.current) clearTimeout(megaTimer.current);
  };

  const showSuggestionPanel = searchFocused;

  const suggestionTypeIcon = (type: "product" | "category" | "seller") =>
    type === "seller" ? Store : type === "category" ? Tag : Package;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Sticky wrapper — everything sticks together ───────────────── */}
      <div className={cn(
        "sticky top-0 z-50 w-full transition-all duration-200",
        elevated ? "shadow-[0_4px_32px_rgba(0,0,0,0.3)]" : "",
      )}
        style={{ backdropFilter: elevated ? "blur(24px) saturate(180%)" : undefined, WebkitBackdropFilter: elevated ? "blur(24px) saturate(180%)" : undefined }}
      >

        {/* ── LEVEL 1: Announcement bar ─────────────────────────────── */}
        <div className="hidden md:block w-full bg-[#0a0d14]">
          <div className="wrap flex items-center justify-between py-[5px]">
            <span style={{ fontSize: 11 }} className="text-white/45 font-medium tracking-wide" suppressHydrationWarning>
              Free delivery above ₹499&nbsp;&nbsp;·&nbsp;&nbsp;Easy 7-day returns&nbsp;&nbsp;·&nbsp;&nbsp;100% Secure Payments
            </span>
            <div className="flex items-center gap-4">
              {[
                { label: "Sell on NexCart", href: "/become-seller" },
                { label: "Help Center", href: "/help" },
                { label: "Download App", href: "/app" },
              ].map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  style={{ fontSize: 11 }}
                  className="text-white/35 hover:text-white/75 transition-colors duration-150 font-medium"
                >
                  {label}
                </Link>
              ))}
              <a
                href="https://wa.me/919876543210?text=Hi%20NexCart%20Support%2C%20I%20need%20help%20with%20my%20order."
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 11 }}
                className="flex items-center gap-1.5 rounded-full bg-[#25D366]/90 px-2.5 py-[3px] font-semibold text-white transition-all hover:bg-[#25D366]"
              >
                <svg viewBox="0 0 24 24" className="h-3 w-3 fill-white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Contact
              </a>
            </div>
          </div>
        </div>

        {/* ── LEVEL 2: Branded header bar ────────────────────────────── */}
        <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}>
        <div className="wrap">
          <div className="flex h-[66px] md:h-[90px] items-center gap-3 md:gap-5 lg:gap-6">

            {/* Mobile: hamburger */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/10 text-white/70 transition-colors md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* LEFT: Logo + Location */}
            <div className="flex shrink-0 items-center gap-5">
              {/* Logo */}
              <Link href="/" className="flex items-center leading-none">
                <span className="text-[21px] md:text-[34px] font-black tracking-[-0.03em] leading-none text-white">
                  Nex<span style={{ background: "linear-gradient(135deg, #60a5fa, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Cart</span>
                </span>
              </Link>

              {/* Location button */}
              <button
                onClick={() => setLocOpen(true)}
                className="hidden lg:flex flex-col items-start leading-none border-l border-white/15 pl-5 group"
              >
                <span style={{ fontSize: 14 }} className="text-white/40 font-medium uppercase tracking-wide">Deliver to</span>
                <span className="flex items-center gap-1.5 mt-[4px]" style={{ fontSize: 18 }}>
                  <MapPin className="h-4.5 w-4.5 text-blue-400 shrink-0" />
                  <span className="font-bold text-white group-hover:text-blue-300 transition-colors duration-150">{pincode} · {city}</span>
                </span>
              </button>
            </div>

            {/* CENTER: Search */}
            <div className="hidden md:block flex-1 min-w-0 relative" ref={searchRef}>
              <form onSubmit={handleSearch}>
                <div className={cn(
                  "flex h-[66px] w-full overflow-visible rounded-xl border-2 transition-all duration-150",
                  searchFocused
                    ? "border-blue-400/70 shadow-[0_0_0_3px_rgba(96,165,250,0.15)]"
                    : "border-white/20 hover:border-white/35",
                  "bg-white dark:bg-[hsl(220_17%_12%)]",
                )}>

                  {/* Category dropdown */}
                  <div className="relative hidden lg:block shrink-0" ref={catDropRef}>
                    <button
                      type="button"
                      onClick={() => setCatDropOpen(v => !v)}
                      className="flex h-full items-center gap-1 border-r border-gray-200 bg-gray-50 px-4 rounded-l-[9px] hover:bg-gray-100 transition-colors"
                      style={{ fontSize: 16 }}
                    >
                      <span className="font-semibold text-gray-600 whitespace-nowrap max-w-[110px] truncate">
                        {selectedCat}
                      </span>
                      <ChevronDown className="h-3 w-3 text-gray-400 shrink-0" />
                    </button>
                    {catDropOpen && (
                      <div className="absolute left-0 top-full mt-1.5 w-52 rounded-xl border border-border/60 bg-white dark:bg-[hsl(220_17%_10%)] shadow-xl z-[60] overflow-hidden">
                        {["All Categories", ...CATS].map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => { setSelectedCat(c); setCatDropOpen(false); }}
                            className={cn(
                              "flex w-full items-center px-4 py-2 text-left transition-colors duration-100 hover:bg-muted",
                              selectedCat === c ? "text-primary font-semibold" : "text-foreground/80",
                            )}
                            style={{ fontSize: 13 }}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <input
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onKeyDown={e => {
                      if (e.key === "ArrowDown") {
                        if (liveSuggestions.length > 0) {
                          e.preventDefault();
                          setActiveSuggestionIdx(i => Math.min(i + 1, liveSuggestions.length - 1));
                        }
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setActiveSuggestionIdx(i => Math.max(i - 1, -1));
                      } else if (e.key === "Enter") {
                        if (activeSuggestionIdx >= 0 && liveSuggestions[activeSuggestionIdx]) {
                          e.preventDefault();
                          const s = liveSuggestions[activeSuggestionIdx];
                          goToSuggestion(s, q.trim());
                          setQ("");
                          setSearchFocused(false);
                          setActiveSuggestionIdx(-1);
                        }
                        // else: let the form's default onSubmit (handleSearch) run
                      } else if (e.key === "Escape") {
                        setSearchFocused(false);
                        setActiveSuggestionIdx(-1);
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    placeholder="Search for products, brands and more..."
                    style={{ fontSize: 18 }}
                    className="flex-1 min-w-0 bg-transparent px-4 text-gray-800 dark:text-foreground placeholder:text-gray-400 outline-none"
                    autoComplete="off"
                  />

                  {/* Search button */}
                  <button
                    type="submit"
                    className="flex shrink-0 items-center justify-center gap-1.5 px-5 rounded-r-[9px] text-white font-bold transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
                    style={{ fontSize: 17, background: "linear-gradient(135deg, #3b82f6 0%, #6d28d9 100%)" }}
                  >
                    <Search className="h-[20px] w-[20px]" />
                    <span className="hidden sm:inline">Search</span>
                  </button>
                </div>
              </form>

              {/* Suggestions dropdown — live, debounced, API-backed (products,
                  sellers, categories), with keyboard nav, bolded match text,
                  a loading state, and recent + trending searches. */}
              {(showSuggestionPanel || (searchFocused && isSellerIdQuery(q))) && (
                <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border border-border/60 bg-white dark:bg-[hsl(220_17%_10%)] shadow-xl z-[60] overflow-hidden max-h-[75vh] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                  {/* Seller ID shortcut */}
                  {isSellerIdQuery(q) && (
                    <div className="p-1 border-b border-border/40">
                      <button
                        type="button"
                        onClick={() => {
                          saveRecentSearch(q.trim());
                          router.push(`/store/${q.trim().toUpperCase()}`);
                          setQ("");
                          setSearchFocused(false);
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left"
                      >
                        <Store className="h-4 w-4 text-primary shrink-0" />
                        <div className="flex-1">
                          <span style={{ fontSize: 13 }} className="font-semibold text-primary">
                            Open Seller Store: {q.trim().toUpperCase()}
                          </span>
                          <p style={{ fontSize: 11 }} className="text-muted-foreground">
                            View all products from this seller
                          </p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </button>
                    </div>
                  )}

                  {q.trim().length >= 2 ? (
                    <>
                      {suggestionsLoading ? (
                        <div className="p-3 space-y-3">
                          {[0, 1, 2].map(i => (
                            <div key={i} className="flex items-center gap-3 animate-pulse">
                              <div className="h-10 w-10 rounded-lg bg-muted shrink-0" />
                              <div className="flex-1 space-y-1.5">
                                <div className="h-2.5 w-2/3 rounded bg-muted" />
                                <div className="h-2 w-1/3 rounded bg-muted" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : liveSuggestions.length > 0 ? (
                        <div className="p-1">
                          {liveSuggestions.map((s, i) => {
                            const Icon = suggestionTypeIcon(s.type);
                            return (
                              <button
                                key={`${s.type}-${s.id}`}
                                type="button"
                                onClick={() => { goToSuggestion(s, q.trim()); setQ(""); setSearchFocused(false); }}
                                onMouseEnter={() => setActiveSuggestionIdx(i)}
                                className={cn(
                                  "flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
                                  activeSuggestionIdx === i ? "bg-muted" : "hover:bg-muted"
                                )}
                              >
                                {s.image ? (
                                  <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-muted/40 border border-border/40">
                                    <Image src={s.image} alt="" fill className="object-cover" sizes="40px" />
                                  </div>
                                ) : (
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 border border-border/40">
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <span style={{ fontSize: 13 }} className="block truncate text-foreground font-medium">
                                    {highlightMatch(s.title, q)}
                                  </span>
                                  <span style={{ fontSize: 11 }} className="text-muted-foreground">
                                    {s.subtitle}
                                  </span>
                                </div>
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              </button>
                            );
                          })}
                          <div className="px-3 py-2 border-t border-border/30 mt-1">
                            <p style={{ fontSize: 10 }} className="text-muted-foreground text-center">↑↓ to navigate · Enter to select · Enter to search all results</p>
                          </div>
                        </div>
                      ) : (
                        <div className="px-3 py-4 text-center">
                          <p style={{ fontSize: 13 }} className="text-muted-foreground">No quick matches for &ldquo;{q.trim()}&rdquo;</p>
                          <p style={{ fontSize: 11 }} className="text-muted-foreground/70 mt-0.5">Press Enter to search the full catalog</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Recent searches */}
                      {recentSearches.length > 0 && (
                        <div className="px-3 py-2.5 border-b border-border/40">
                          <p style={{ fontSize: 11 }} className="text-muted-foreground font-semibold uppercase tracking-wide mb-2">
                            Recent Searches
                          </p>
                          <div className="flex flex-col">
                            {recentSearches.map(term => (
                              <div key={term} className="group flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-muted transition-colors">
                                <button
                                  type="button"
                                  onClick={() => { setQ(term); }}
                                  className="flex flex-1 items-center gap-2.5 min-w-0 text-left"
                                >
                                  <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  <span style={{ fontSize: 13 }} className="text-foreground truncate">{term}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeRecentSearch(term)}
                                  className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                  aria-label="Remove"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Trending chips */}
                      <div className="px-3 py-2.5">
                        <p style={{ fontSize: 11 }} className="text-muted-foreground font-semibold uppercase tracking-wide mb-2">
                          Trending
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {TRENDING.map(t => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                saveRecentSearch(t);
                                router.push(`/search?q=${encodeURIComponent(t)}`);
                                setSearchFocused(false);
                              }}
                              style={{ fontSize: 12 }}
                              className="rounded-full border border-border/60 bg-muted/60 hover:bg-primary/8 hover:border-primary/30 hover:text-primary px-3 py-1 text-foreground/70 transition-colors"
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT: Account + Seller + Cart (desktop) */}
            <div className="hidden md:flex shrink-0 items-center gap-0.5">

              {/* Account block */}
              <div className="relative" ref={acctRef}>
                <button
                  onClick={() => setAcctOpen(v => !v)}
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 hover:bg-white/10 transition-colors duration-150 group"
                >
                  {/* Avatar / icon */}
                  {user ? (
                    <div className="h-14 w-14 rounded-full flex items-center justify-center font-black shrink-0 text-white" style={{ fontSize: 21, background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}>
                      {user.displayName?.[0]?.toUpperCase() ?? "U"}
                    </div>
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                      <User2 className="h-7 w-7 text-white/70 shrink-0" />
                    </div>
                  )}
                  <div className="text-left leading-none hidden lg:block">
                    <div style={{ fontSize: 17 }} className="text-white/45">
                      Hello, {user ? user.displayName?.split(" ")[0] ?? "there" : "Sign in"}
                    </div>
                    <div className="flex items-center gap-1 mt-[5px]" style={{ fontSize: 20 }}>
                      <span className="font-bold text-white">Account &amp; Lists</span>
                      <ChevronDown className="h-5 w-5 text-white/40 mt-px" />
                    </div>
                  </div>
                </button>

                {acctOpen && (
                  <div className="a-fin absolute right-0 top-full mt-1.5 w-56 rounded-2xl border border-border/60 bg-white dark:bg-[hsl(220_17%_10%)] shadow-2xl overflow-hidden z-[60]">
                    {user ? (
                      <div className="px-4 py-3 bg-primary/5 border-b border-border/50">
                        <p className="font-bold text-sm truncate">{user.displayName ?? "User"}</p>
                        <p style={{ fontSize: 11 }} className="text-muted-foreground truncate mt-0.5">{user.email}</p>
                      </div>
                    ) : (
                      <div className="p-3 border-b border-border/50 space-y-1.5">
                        <Link href="/sign-in" onClick={() => setAcctOpen(false)}
                          className="flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-bold text-white hover:brightness-110 transition-all"
                          style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}>
                          Sign In
                        </Link>
                        <p style={{ fontSize: 11 }} className="text-center text-muted-foreground">
                          New customer?{" "}
                          <Link href="/sign-up" className="text-primary font-semibold" onClick={() => setAcctOpen(false)}>
                            Start here
                          </Link>
                        </p>
                      </div>
                    )}
                    <div className="p-1.5 space-y-0.5">
                      {[
                        { href: "/account", icon: User2, label: "My Account" },
                        { href: "/orders", icon: Package, label: "My Orders" },
                        { href: "/wishlist", icon: Heart, label: "Wishlist" },
                        { href: "/dashboard", icon: Store, label: "Seller Dashboard" },
                      ].map(({ href, icon: Icon, label }) => (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setAcctOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-foreground/75 hover:bg-muted hover:text-foreground transition-colors"
                          style={{ fontSize: 13 }}
                        >
                          <Icon className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                          {label}
                        </Link>
                      ))}
                    </div>
                    {user && (
                      <div className="border-t border-border/50 p-1.5">
                        <button
                          onClick={() => { signOut(auth); setAcctOpen(false); }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                          style={{ fontSize: 13 }}
                        >
                          <LogOut className="h-4 w-4 shrink-0" /> Sign out
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Become a Seller */}
              <Link
                href="/become-seller"
                className="hidden lg:flex flex-col items-start leading-none rounded-xl px-2.5 py-2 hover:bg-white/10 transition-colors duration-150 group"
              >
                <span style={{ fontSize: 17 }} className="text-white/40">Make money</span>
                <span style={{ fontSize: 21 }} className="font-bold text-white mt-[5px]">with us</span>
              </Link>

              {/* Notification Bell */}
              <NotificationBellClient />

              {/* Cart */}
              <button
                id="navbar-cart-btn-desktop"
                onClick={() => window.dispatchEvent(new CustomEvent("nxc:opencart"))}
                aria-label="Cart"
                className="flex flex-col items-center justify-center rounded-xl px-2.5 py-2 hover:bg-white/10 transition-colors duration-150 relative group"
              >
                <div className="relative">
                  <ShoppingCart className="h-[38px] w-[38px] text-white/80" />
                  {totalItems > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-[26px] min-w-[26px] items-center justify-center rounded-full px-1 text-[14px] font-black text-white leading-none"
                      style={{ background: "linear-gradient(135deg, #f97316, #ef4444)" }}>
                      {totalItems > 9 ? "9+" : totalItems}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 19 }} className="font-bold text-white/55 mt-[4px]">Cart</span>
                {totalItems > 0 && (
                  <span style={{ fontSize: 16 }} className="text-blue-300 font-semibold leading-none">
                    {formatPrice(totalPrice)}
                  </span>
                )}
              </button>
            </div>

            {/* Mobile: search bar + notification + cart icons */}
            <div className="flex md:hidden items-center gap-2 ml-auto flex-1 min-w-0 justify-end">
              <button
                onClick={() => { setMobileSearchOpen(true); setTimeout(() => mobileInputRef.current?.focus(), 80); }}
                className="flex flex-1 min-w-0 items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-2 text-white/50 max-w-[160px] active:bg-white/15 transition-colors"
              >
                <Search className="h-4 w-4 shrink-0 text-white/50" />
                <span className="text-[13px] truncate">Search...</span>
              </button>
              <NotificationBellMobileClient />
              <button
                id="navbar-cart-btn"
                onClick={() => window.dispatchEvent(new CustomEvent("nxc:opencart"))}
                aria-label="Cart"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/10 text-white/70 transition-colors"
              >
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[10px] font-black text-white leading-none"
                    style={{ background: "linear-gradient(135deg, #f97316, #ef4444)" }}>
                    {totalItems > 9 ? "9+" : totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
        </div>{/* end navy header */}

        {/* ── Mobile expanding search bar ────────────────────────────── */}
        {mobileSearchOpen && (
          <div className="md:hidden w-full bg-white dark:bg-[hsl(220_17%_10%)] border-b border-border/40 shadow-lg">
            {/* Input row */}
            <form
              className="flex items-center gap-2 px-3 py-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (mobileQ.trim()) {
                  saveRecentSearch(mobileQ.trim());
                  router.push(`/search?q=${encodeURIComponent(mobileQ.trim())}`);
                  setMobileSearchOpen(false);
                  setMobileQ("");
                }
              }}
            >
              <button
                type="button"
                onClick={() => { setMobileSearchOpen(false); setMobileQ(""); }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground/60 hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex flex-1 items-center gap-2 rounded-xl border-2 border-primary/40 bg-gray-50 dark:bg-[hsl(220_17%_14%)] px-3 py-2 focus-within:border-primary transition-colors">
                <Search className="h-4 w-4 shrink-0 text-gray-400" />
                <input
                  ref={mobileInputRef}
                  value={mobileQ}
                  onChange={e => setMobileQ(e.target.value)}
                  placeholder="Search products, brands..."
                  className="flex-1 min-w-0 bg-transparent text-[16px] leading-snug text-gray-900 dark:text-foreground placeholder:text-gray-400 outline-none"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                {mobileQ.length > 0 && (
                  <button type="button" onClick={() => setMobileQ("")} className="shrink-0 text-gray-400">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-colors"
                style={{ background: "linear-gradient(135deg, #3b82f6, #6d28d9)" }}
              >
                <Search className="h-4 w-4" />
              </button>
            </form>

            {/* Recent + Trending — box empty */}
            {mobileQ.trim().length < 2 && (
              <div className="pb-3">
                {recentSearches.length > 0 && (
                  <div className="px-4 pb-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recent Searches</p>
                    <div className="flex flex-col">
                      {recentSearches.map(term => (
                        <div key={term} className="flex items-center gap-2 rounded-xl px-1 py-2 active:bg-muted transition-colors">
                          <button
                            type="button"
                            onClick={() => setMobileQ(term)}
                            className="flex flex-1 items-center gap-2.5 min-w-0 text-left"
                          >
                            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="text-[14px] text-foreground truncate">{term}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRecentSearch(term)}
                            className="shrink-0 text-muted-foreground/50 p-1"
                            aria-label="Remove"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="px-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Trending</p>
                  <div className="flex flex-wrap gap-2">
                    {TRENDING.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          saveRecentSearch(t);
                          router.push(`/search?q=${encodeURIComponent(t)}`);
                          setMobileSearchOpen(false);
                          setMobileQ("");
                        }}
                        className="rounded-full border border-border/60 bg-muted/60 px-3 py-1.5 text-[12px] font-medium text-foreground/75 active:bg-muted transition-colors"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Live suggestions when typing */}
            {mobileQ.trim().length >= 2 && (
              <div className="px-2 pb-2 space-y-0.5">
                {suggestionsLoading ? (
                  <div className="px-2 py-3 space-y-3">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="h-10 w-10 rounded-lg bg-muted shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-2.5 w-2/3 rounded bg-muted" />
                          <div className="h-2 w-1/3 rounded bg-muted" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  liveSuggestions.map(s => {
                    const Icon = suggestionTypeIcon(s.type);
                    return (
                      <button
                        key={`${s.type}-${s.id}`}
                        type="button"
                        onClick={() => {
                          goToSuggestion(s, mobileQ.trim());
                          setMobileSearchOpen(false);
                          setMobileQ("");
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left active:bg-muted transition-colors"
                      >
                        {s.image ? (
                          <div className="relative h-9 w-9 shrink-0 rounded-lg overflow-hidden bg-muted/40 border border-border/40">
                            <Image src={s.image} alt="" fill className="object-cover" sizes="36px" />
                          </div>
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 border border-border/40">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <span className="flex-1 text-[14px] text-foreground truncate">{highlightMatch(s.title, mobileQ)}</span>
                        <span className="text-[11px] text-muted-foreground shrink-0">{s.subtitle}</span>
                      </button>
                    );
                  })
                )}
                <button
                  type="button"
                  onClick={() => {
                    saveRecentSearch(mobileQ.trim());
                    router.push(`/search?q=${encodeURIComponent(mobileQ.trim())}`);
                    setMobileSearchOpen(false);
                    setMobileQ("");
                  }}
                  className="flex w-full items-center gap-3 rounded-xl bg-primary/8 px-3 py-2.5 text-left active:bg-primary/15 transition-colors"
                >
                  <Search className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="flex-1 text-[14px] font-semibold text-primary">Search &ldquo;{mobileQ}&rdquo;</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-primary" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── LEVEL 3: Category strip ────────────────────────────────── */}
        <div
          className="block border-b border-white/10 relative"
          style={{ background: "#131c2e" }}
        >
          <div className="w-full px-3 sm:px-4">
            <div
              className="flex items-center gap-1.5 overflow-x-auto py-2 md:py-3 md:overflow-hidden md:gap-1"
              style={{ scrollbarWidth: "none" }}
              onMouseLeave={handleMegaLeave}
            >
              {/* Today's Deals */}
              <Link
                href="/deals"
                className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-1 md:px-4 md:py-3 rounded-full bg-white/8 text-red-300 hover:bg-red-500 hover:text-white font-bold text-[11px] md:text-[22px] transition-all duration-200 whitespace-nowrap md:flex-1"
              >
                <Flame className="h-3 w-3" />
                Today&apos;s Deals
              </Link>

              <div className="h-4 w-px bg-white/10 mx-1 shrink-0 md:hidden" />

              {/* All 10 categories */}
              {CATS.map(cat => (
                <div key={cat} className="relative shrink-0 md:flex-1 md:flex md:justify-center" onMouseEnter={() => handleMegaEnter(cat)}>
                  <button
                    onClick={() => setMegaCat(megaCat === cat ? null : cat)}
                    style={{ ["--cat-accent" as string]: CATEGORY_ACCENTS[cat] ?? "#ffffff" }}
                    className={cn(
                      "flex items-center justify-center w-full px-2 py-1 md:px-3 md:py-3 rounded-full text-[11px] md:text-[22px] font-medium whitespace-nowrap transition-all duration-200",
                      "bg-white/8 text-white/75 hover:bg-[var(--cat-accent)] hover:text-white",
                      megaCat === cat && "bg-[var(--cat-accent)] text-white font-bold"
                    )}
                  >
                    {cat}
                  </button>
                </div>
              ))}

              <div className="h-4 w-px bg-white/10 mx-1 shrink-0 md:hidden" />

              {/* New Arrivals */}
              <Link
                href="/new"
                className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-1 md:px-4 md:py-3 rounded-full bg-white/8 text-emerald-300 hover:bg-emerald-500 hover:text-white font-bold text-[11px] md:text-[22px] transition-all duration-200 whitespace-nowrap md:flex-1"
              >
                <Sparkles className="h-3 w-3" />
                New Arrivals
              </Link>
            </div>
          </div>

          {/* Mega dropdown panel */}
          {megaCat && MEGA[megaCat] && (
            <div
              className="absolute left-0 right-0 top-full z-[55] border-t border-border/30 bg-white dark:bg-[hsl(220_17%_8%)] shadow-[0_12px_48px_rgba(0,0,0,0.15)] max-h-[75vh] overflow-y-auto"
              onMouseEnter={handleMegaContentEnter}
              onMouseLeave={handleMegaLeave}
            >
              <div className="wrap py-9">

                {/* Mobile: promo banner at top */}
                <div className={cn(
                  "flex items-center justify-between rounded-xl bg-gradient-to-br px-4 py-3 text-white mb-4 lg:hidden",
                  MEGA[megaCat].promoColor,
                )}>
                  <div>
                    <span style={{ fontSize: 10 }} className="font-semibold uppercase tracking-widest opacity-80">Special Offer</span>
                    <p style={{ fontSize: 18 }} className="font-bold leading-tight">UP TO 60% OFF</p>
                    <p style={{ fontSize: 11 }} className="opacity-80 mt-0.5">{MEGA[megaCat].promoText}</p>
                  </div>
                  <Link
                    href={`/categories/${getSlug(megaCat)}`}
                    className="rounded-lg bg-white/20 hover:bg-white/30 px-3 py-1.5 font-bold text-[11px] whitespace-nowrap transition-colors ml-3"
                    onClick={() => setMegaCat(null)}
                  >
                    Shop Now →
                  </Link>
                </div>

                {/* Subcategories — horizontal scroll on mobile, vertical list on desktop */}
                <div className="mb-3 lg:hidden">
                  <p style={{ fontSize: 10 }} className="font-semibold uppercase tracking-widest text-muted-foreground mb-2">{megaCat}</p>
                  <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                    {MEGA[megaCat].subcats.map(s => (
                      <Link
                        key={s}
                        href={`/categories/${getSlug(megaCat)}?sub=${encodeURIComponent(s)}`}
                        className={cn(
                          "shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium whitespace-nowrap transition-all",
                          CAT_COLORS[megaCat]?.base ?? "bg-muted text-foreground/75",
                          CAT_COLORS[megaCat]?.hover ?? "hover:bg-primary hover:text-white"
                        )}
                        onClick={() => setMegaCat(null)}
                      >
                        {s}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Brands — horizontal scroll on mobile */}
                <div className="lg:hidden">
                  <p style={{ fontSize: 10 }} className="font-semibold uppercase tracking-widest text-muted-foreground mb-2">Top Brands</p>
                  <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                    {MEGA[megaCat].brands.map(b => (
                      <Link
                        key={b}
                        href={`/search?brand=${encodeURIComponent(b)}`}
                        className="shrink-0 rounded-full border border-border/60 bg-[hsl(214_32%_97%)] dark:bg-[hsl(220_17%_12%)] px-3 py-1 text-[11px] font-semibold text-foreground/80 hover:border-primary/50 hover:text-primary transition-colors"
                        onClick={() => setMegaCat(null)}
                      >
                        {b}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Desktop: original 3-column grid */}
                <div className="hidden lg:grid grid-cols-[340px_1fr_360px] gap-12">
                  <div>
                    <p style={{ fontSize: 18 }} className="font-bold uppercase tracking-widest text-muted-foreground mb-5">{megaCat}</p>
                    <ul className="space-y-2.5">
                      {MEGA[megaCat].subcats.map(s => (
                        <li key={s}>
                          <Link
                            href={`/categories/${getSlug(megaCat)}?sub=${encodeURIComponent(s)}`}
                            className={cn(
                              "flex items-center justify-between group rounded-xl px-5 py-3.5 transition-all duration-200 font-semibold",
                              CAT_COLORS[megaCat]?.base ?? "bg-muted text-foreground/75",
                              CAT_COLORS[megaCat]?.hover ?? "hover:bg-primary hover:text-white"
                            )}
                            style={{ fontSize: 19 }}
                            onClick={() => setMegaCat(null)}
                          >
                            {s}
                            <ChevronRight className="h-5 w-5 opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p style={{ fontSize: 18 }} className="font-bold uppercase tracking-widest text-muted-foreground mb-5">Top Brands</p>
                    <div className="flex flex-wrap gap-4">
                      {MEGA[megaCat].brands.map(b => (
                        <Link
                          key={b}
                          href={`/search?brand=${encodeURIComponent(b)}`}
                          className="rounded-full border border-border/60 bg-[hsl(214_32%_97%)] dark:bg-[hsl(220_17%_12%)] px-6 py-3 font-semibold text-foreground/80 hover:border-primary/50 hover:text-primary transition-colors"
                          style={{ fontSize: 18 }}
                          onClick={() => setMegaCat(null)}
                        >
                          {b}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className={cn(
                      "flex flex-col items-start justify-between rounded-2xl bg-gradient-to-br p-8 h-full min-h-[240px] text-white",
                      MEGA[megaCat].promoColor,
                    )}>
                      <div>
                        <span style={{ fontSize: 17 }} className="font-semibold uppercase tracking-widest opacity-80">Special Offer</span>
                        <p style={{ fontSize: 42 }} className="font-bold leading-tight mt-2">UP TO<br />60% OFF</p>
                        <p style={{ fontSize: 18 }} className="opacity-90 font-medium mt-2">{MEGA[megaCat].promoText}</p>
                      </div>
                      <Link
                        href={`/categories/${getSlug(megaCat)}`}
                        className="mt-5 rounded-lg bg-white/20 hover:bg-white/30 px-6 py-3 font-bold transition-colors"
                        style={{ fontSize: 17 }}
                        onClick={() => setMegaCat(null)}
                      >
                        Shop Now →
                      </Link>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Location Modal ──────────────────────────────────────────────── */}
      {locOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setLocOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-border/60 bg-white dark:bg-[hsl(220_17%_10%)] p-6 shadow-2xl mx-4">
            <button
              onClick={() => setLocOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-[16px]">Choose delivery location</h3>
            </div>
            <p style={{ fontSize: 13 }} className="text-muted-foreground mb-4">
              Enter your pincode to see delivery options and estimated delivery dates.
            </p>
            <div className="flex gap-2">
              <input
                value={pinInput}
                onChange={e => setPinInput(e.target.value.replace(/\D/, "").slice(0, 6))}
                placeholder="Enter 6-digit pincode"
                className="flex-1 h-10 rounded-xl border border-input bg-background px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
              <button
                onClick={() => setLocOpen(false)}
                className="h-10 rounded-xl bg-primary px-4 text-sm font-bold text-white hover:brightness-110 transition-all"
              >
                Apply
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-px flex-1 bg-border/50" />
              <span style={{ fontSize: 11 }} className="text-muted-foreground font-medium">or</span>
              <div className="h-px flex-1 bg-border/50" />
            </div>
            <button
              onClick={() => setLocOpen(false)}
              style={{ fontSize: 13 }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 py-2 font-semibold text-foreground/80 hover:bg-muted transition-colors"
            >
              <MapPin className="h-4 w-4 text-primary" />
              Detect my location
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile full-screen drawer ───────────────────────────────────── */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-[90] bg-black/50 md:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-[91] w-[300px] bg-white dark:bg-[hsl(220_17%_8%)] shadow-2xl flex flex-col md:hidden a-slr overflow-y-auto">
            {/* Drawer header */}
            <div className="flex items-center justify-between bg-primary px-4 py-4">
              <div className="flex items-center gap-2">
                {user ? (
                  <>
                    <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center font-semibold text-white text-sm">
                      {user.displayName?.[0]?.toUpperCase() ?? "U"}
                    </div>
                    <div className="leading-none">
                      <p style={{ fontSize: 11 }} className="text-white/70">Hello,</p>
                      <p style={{ fontSize: 15 }} className="text-white font-semibold">{user.displayName?.split(" ")[0] ?? "User"}</p>
                    </div>
                  </>
                ) : (
                  <div className="leading-none">
                    <p style={{ fontSize: 15 }} className="text-white font-semibold">Welcome!</p>
                    <Link href="/sign-in" onClick={() => setDrawerOpen(false)}
                      style={{ fontSize: 12 }} className="text-white/80 underline">
                      Sign in or create account
                    </Link>
                  </div>
                )}
              </div>
              <button onClick={() => setDrawerOpen(false)} className="rounded-lg p-1.5 hover:bg-white/10 transition-colors">
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 p-3 space-y-0.5">
              <p style={{ fontSize: 11 }} className="px-3 py-2 font-semibold uppercase tracking-widest text-muted-foreground">
                Navigation
              </p>
              {[
                { href: "/", label: "Home" },
                { href: "/search", label: "All Products" },
                { href: "/orders", label: "My Orders" },
                { href: "/wishlist", label: "Wishlist" },
                { href: "/account", label: "My Account" },
                { href: "/become-seller", label: "Sell on NexCart" },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center rounded-xl px-3 py-2.5 font-medium text-foreground/80 hover:bg-muted hover:text-foreground transition-colors"
                  style={{ fontSize: 14 }}
                >
                  {label}
                </Link>
              ))}

              <div className="pt-2">
                <p style={{ fontSize: 11 }} className="px-3 py-2 font-semibold uppercase tracking-widest text-muted-foreground">
                  Shop by Category
                </p>
                {CATS.map(c => (
                  <Link
                    key={c}
                    href={`/categories/${getSlug(c)}`}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 text-foreground/75 hover:bg-muted hover:text-foreground transition-colors"
                    style={{ fontSize: 13 }}
                  >
                    {c}
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Drawer footer */}
            {user && (
              <div className="border-t border-border/50 p-3">
                <button
                  onClick={() => { signOut(auth); setDrawerOpen(false); }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors font-semibold"
                  style={{ fontSize: 13 }}
                >
                  <LogOut className="h-4 w-4 shrink-0" /> Sign out
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
