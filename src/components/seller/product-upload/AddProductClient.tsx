"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp,
  Info, Eye, CheckCircle2, AlertCircle, Zap, Tag,
  Package, FileText, Image as ImageIcon, BarChart2, Layers,
  Gift, Percent, Wallet, CreditCard, Truck as TruckIcon, X,
  Globe, EyeOff,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/shared/ImageUpload";
import { CategorySelector } from "@/components/seller/product-upload/CategorySelector";
import { ProductTypeSelector } from "@/components/seller/product-upload/ProductTypeSelector";
import { SpecFields } from "@/components/seller/product-upload/SpecFields";
import { VariantManager, type ComboVariantRow } from "@/components/seller/product-upload/VariantManager";
import { ProductDesignPicker } from "@/components/seller/product-upload/ProductDesignPicker";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProductCard } from "@/components/product/ProductCard";
import { productSchema, type ProductInput } from "@/lib/validations";
import { auth } from "@/lib/firebase";
import { DEFAULT_CARD_DESIGN, DEFAULT_CARD_FONT } from "@/lib/card-designs";
import type { CategoryConfig, ProductType } from "@/lib/category-config";

// ─── Step Progress Bar ─────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Category", icon: Layers },
  { id: 2, label: "Product Type", icon: Package },
  { id: 3, label: "Basic Info", icon: FileText },
  { id: 4, label: "Specifications", icon: BarChart2 },
  { id: 5, label: "Images & Variants", icon: ImageIcon },
  { id: 6, label: "Offers", icon: Tag },
];

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center w-full mb-8 overflow-x-auto pb-1">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const done = s.id < step;
        const active = s.id === step;
        return (
          <div key={s.id} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center gap-1">
              <div className={`h-8 w-8 lg:h-11 lg:w-11 rounded-full flex items-center justify-center border-2 transition-all duration-200
                ${done ? "bg-blue-600 border-blue-600 text-white" :
                  active ? "border-blue-600 text-blue-600 bg-blue-50" :
                  "border-gray-200 text-gray-400 bg-white"}`}>
                {done ? <CheckCircle2 className="h-4 w-4 lg:h-5 lg:w-5" /> : <Icon className="h-4 w-4 lg:h-5 lg:w-5" />}
              </div>
              <span className={`text-[10px] lg:text-[13px] font-medium whitespace-nowrap
                ${active ? "text-blue-600" : done ? "text-gray-600" : "text-gray-400"}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-10 sm:w-16 lg:w-20 mx-1 lg:mx-2 mb-4 lg:mb-5 transition-colors
                ${done ? "bg-blue-600" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Listing Quality Score ─────────────────────────────────────────────────

function QualityScore({ score, checks }: { score: number; checks: { label: string; done: boolean }[] }) {
  const color = score >= 80 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-500";
  const bg = score >= 80 ? "bg-green-50 border-green-200" : score >= 50 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${bg}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">Listing Quality</span>
        <span className={`text-lg font-bold ${color}`}>{score}%</span>
      </div>
      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${score >= 80 ? "bg-green-500" : score >= 50 ? "bg-yellow-400" : "bg-red-400"}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <ul className="space-y-1">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-1.5 text-xs">
            {c.done
              ? <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
              : <AlertCircle className="h-3 w-3 text-gray-300 flex-shrink-0" />}
            <span className={c.done ? "text-gray-700" : "text-gray-400"}>{c.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Contextual placeholder helpers ───────────────────────────────────────

const CATEGORY_PLACEHOLDERS: Record<string, {
  featureBullets: string[];
  inTheBox: string[];
  brandPlaceholder: string;
  modelPlaceholder: string;
  tagsPlaceholder: string;
  keywordsPlaceholder: string;
}> = {
  // Electronics
  laptop: {
    featureBullets: ["e.g. Intel Core i7 13th Gen for blazing performance", "e.g. 16GB DDR5 RAM for seamless multitasking", "e.g. 512GB NVMe SSD ultra-fast storage", "e.g. 15.6\" FHD 144Hz anti-glare display", "e.g. RTX 4060 for gaming & creative work", "e.g. 65W fast charging, 10hr battery life"],
    inTheBox: ["Laptop", "Charger (65W)", "User Manual", "Warranty Card"],
    brandPlaceholder: "e.g. Lenovo, HP, Dell, ASUS",
    modelPlaceholder: "e.g. IdeaPad Slim 5, Victus 15",
    tagsPlaceholder: "e.g. laptop, ultrabook, gaming laptop, college laptop",
    keywordsPlaceholder: "e.g. thin light laptop, oled display laptop, i7 laptop under 80000",
  },
  mobile: {
    featureBullets: ["e.g. Snapdragon 8 Gen 2 for flagship-grade speed", "e.g. 50MP Sony IMX890 main camera", "e.g. 5000mAh battery with 67W fast charge", "e.g. 6.7\" AMOLED 120Hz curved display", "e.g. 256GB storage — no lag, no limits", "e.g. IP68 water & dust resistant"],
    inTheBox: ["Smartphone", "Charger (67W)", "USB-C Cable", "SIM Ejector Pin", "Protective Case"],
    brandPlaceholder: "e.g. Samsung, OnePlus, Xiaomi, iQOO",
    modelPlaceholder: "e.g. Galaxy S24, 12T Pro",
    tagsPlaceholder: "e.g. 5g phone, camera phone, gaming phone",
    keywordsPlaceholder: "e.g. best phone under 30000, 5g phone india, long battery phone",
  },
  tablet: {
    featureBullets: ["e.g. 10.9\" Liquid Retina display for vivid visuals", "e.g. Apple M1 chip — desktop-class performance", "e.g. All-day battery, up to 10 hours", "e.g. 12MP Ultra Wide front camera", "e.g. iPadOS with Apple Pencil support", "e.g. Wi-Fi 6 + Bluetooth 5.0 connectivity"],
    inTheBox: ["Tablet", "Charging Cable", "Power Adapter", "Quick Start Guide"],
    brandPlaceholder: "e.g. Apple, Samsung, Lenovo",
    modelPlaceholder: "e.g. iPad Air 5, Galaxy Tab S9",
    tagsPlaceholder: "e.g. tablet, ipad, android tablet",
    keywordsPlaceholder: "e.g. best tablet for students, drawing tablet, video streaming tablet",
  },
  smartwatch: {
    featureBullets: ["e.g. Always-on AMOLED display with 1000 nits", "e.g. Advanced health monitoring — SpO2, ECG", "e.g. 7-day battery life on a single charge", "e.g. GPS + GLONASS for accurate tracking", "e.g. IP68 water-resistant up to 50m", "e.g. 100+ sport modes & workout tracking"],
    inTheBox: ["Smartwatch", "Charging Cable / Dock", "Extra Strap", "User Guide"],
    brandPlaceholder: "e.g. Apple, Samsung, Noise, boAt",
    modelPlaceholder: "e.g. Apple Watch Series 9, Galaxy Watch 6",
    tagsPlaceholder: "e.g. smartwatch, fitness tracker, health watch",
    keywordsPlaceholder: "e.g. best smartwatch under 5000, heart rate monitor watch",
  },
  tv: {
    featureBullets: ["e.g. 4K UHD with Dolby Vision for cinema-like clarity", "e.g. Google TV with 700+ streaming apps", "e.g. Dolby Atmos 30W surround sound", "e.g. 120Hz VRR for smooth gaming", "e.g. 3x HDMI 2.1 ports for all devices", "e.g. Voice remote with Google Assistant"],
    inTheBox: ["Smart TV", "Remote Control (with batteries)", "Power Cable", "Wall Mount Screws", "User Manual"],
    brandPlaceholder: "e.g. Sony, Samsung, LG, Mi",
    modelPlaceholder: "e.g. BRAVIA X90L, Crystal 4K",
    tagsPlaceholder: "e.g. smart tv, 4k tv, oled tv",
    keywordsPlaceholder: "e.g. 55 inch 4k tv, best tv under 50000, google tv india",
  },
  headphones: {
    featureBullets: ["e.g. Industry-leading Active Noise Cancellation", "e.g. 30-hour battery life with ANC on", "e.g. Hi-Res Audio with LDAC codec", "e.g. Multipoint Bluetooth 5.3 connection", "e.g. Foldable design with carry case included", "e.g. Touch controls & voice assistant support"],
    inTheBox: ["Headphones / Earbuds", "Carrying Case", "USB-C Charging Cable", "3.5mm Audio Cable", "User Manual"],
    brandPlaceholder: "e.g. Sony, Bose, boAt, JBL",
    modelPlaceholder: "e.g. WH-1000XM5, QuietComfort 45",
    tagsPlaceholder: "e.g. wireless headphones, anc headphones, earbuds",
    keywordsPlaceholder: "e.g. best noise cancelling headphones, bluetooth earphones under 2000",
  },
  // Fashion
  tshirt: {
    featureBullets: ["e.g. 100% breathable cotton for all-day comfort", "e.g. Enzyme washed for extra softness", "e.g. Ribbed crew neck, stays in shape", "e.g. Pre-shrunk fabric — wash after wash", "e.g. Available in 8 versatile colours", "e.g. Slim fit — flatters all body types"],
    inTheBox: ["T-Shirt (1 Piece)"],
    brandPlaceholder: "e.g. H&M, Allen Solly, US Polo",
    modelPlaceholder: "e.g. Classic Crew Neck, TS-2024",
    tagsPlaceholder: "e.g. t-shirt, cotton tee, round neck, casual wear",
    keywordsPlaceholder: "e.g. oversized tshirt men, cotton tshirt women, plain white tshirt",
  },
  shirt: {
    featureBullets: ["e.g. Premium Egyptian cotton — silky smooth", "e.g. Wrinkle-resistant for all-day crispness", "e.g. Spread collar with reinforced buttons", "e.g. Slim fit, tailored for a sharp look", "e.g. Machine washable, retains colour", "e.g. Formal & business-casual ready"],
    inTheBox: ["Shirt (1 Piece)"],
    brandPlaceholder: "e.g. Van Heusen, Arrow, Peter England",
    modelPlaceholder: "e.g. Formal Slim Fit, SH-2024",
    tagsPlaceholder: "e.g. formal shirt, cotton shirt, office wear",
    keywordsPlaceholder: "e.g. white formal shirt men, linen shirt summer, slim fit shirt",
  },
  jeans: {
    featureBullets: ["e.g. Premium 98% cotton denim, 2% stretch", "e.g. Slim tapered fit — modern & versatile", "e.g. Reinforced stitching at stress points", "e.g. 5-pocket classic design", "e.g. Machine washable, keeps colour longer", "e.g. Mid-rise waist for all-day comfort"],
    inTheBox: ["Jeans (1 Piece)"],
    brandPlaceholder: "e.g. Levi's, Wrangler, Pepe Jeans",
    modelPlaceholder: "e.g. 501 Original, Slim 511",
    tagsPlaceholder: "e.g. jeans, denim, slim fit jeans",
    keywordsPlaceholder: "e.g. skinny jeans women, stretch jeans men, dark wash jeans",
  },
  shoes: {
    featureBullets: ["e.g. Full-grain leather upper — premium durability", "e.g. Memory foam insole for all-day comfort", "e.g. Slip-resistant rubber outsole", "e.g. Lightweight — only 280g per pair", "e.g. Breathable mesh lining, odour-resistant", "e.g. Suitable for formal & smart-casual wear"],
    inTheBox: ["Pair of Shoes", "Dust Bag", "Extra Laces"],
    brandPlaceholder: "e.g. Nike, Adidas, Bata, Puma",
    modelPlaceholder: "e.g. Air Max 90, Ultraboost 22",
    tagsPlaceholder: "e.g. sneakers, running shoes, formal shoes",
    keywordsPlaceholder: "e.g. white sneakers men, running shoes women, leather formal shoes",
  },
  saree: {
    featureBullets: ["e.g. Pure Kanjivaram silk with zari border", "e.g. Rich woven gold & silver motifs", "e.g. Blouse piece included, stitching-ready", "e.g. Perfect for weddings & festive occasions", "e.g. Dry-clean recommended for longevity", "e.g. 6.3 metres length, drapes beautifully"],
    inTheBox: ["Saree (1 Piece)", "Blouse Piece (unstitched)"],
    brandPlaceholder: "e.g. Nalli, Kalyan Silks, Fabindia",
    modelPlaceholder: "e.g. Kanjivaram Wedding Special",
    tagsPlaceholder: "e.g. saree, silk saree, banarasi saree, wedding saree",
    keywordsPlaceholder: "e.g. kanjivaram silk saree, georgette saree online, party wear saree",
  },
  // Grocery
  grains: {
    featureBullets: ["e.g. Premium aged Basmati — long extra-thin grains", "e.g. Double-cleaned, stone-free, ready to cook", "e.g. Rich aroma, fluffy texture after cooking", "e.g. Low glycaemic index, good for health", "e.g. Vacuum-packed for freshness & longer shelf life"],
    inTheBox: ["Rice / Grain Pack"],
    brandPlaceholder: "e.g. India Gate, Daawat, Aashirvaad",
    modelPlaceholder: "e.g. Super Basmati, Sona Masuri Premium",
    tagsPlaceholder: "e.g. basmati rice, sona masuri, organic rice",
    keywordsPlaceholder: "e.g. 5kg basmati rice, organic rice online, biryani rice",
  },
  spices: {
    featureBullets: ["e.g. Stone-ground for maximum flavour & aroma", "e.g. No artificial colours or preservatives", "e.g. Sun-dried & hygienically packed", "e.g. Rich in antioxidants, naturally organic", "e.g. Resealable zip pouch for freshness"],
    inTheBox: ["Spice / Masala Pack"],
    brandPlaceholder: "e.g. Everest, MDH, Catch, Sakthi",
    modelPlaceholder: "e.g. Garam Masala Premium, Red Chilli Powder",
    tagsPlaceholder: "e.g. spices, masala, chilli powder, turmeric",
    keywordsPlaceholder: "e.g. organic spices india, pure turmeric powder, garam masala",
  },
  // Furniture
  sofa: {
    featureBullets: ["e.g. Solid sheesham wood frame — lasts decades", "e.g. High-density foam cushions for extra comfort", "e.g. Premium fabric upholstery, stain-resistant", "e.g. 5-year warranty on frame & springs", "e.g. Easy DIY assembly — tools included", "e.g. Available in 6 fabric colours"],
    inTheBox: ["Sofa Frame", "Cushions", "Assembly Hardware", "Allen Key", "User Manual"],
    brandPlaceholder: "e.g. Urban Ladder, Pepperfry, IKEA",
    modelPlaceholder: "e.g. Cosmo 3-Seater, Elara L-Shape",
    tagsPlaceholder: "e.g. sofa, 3 seater sofa, fabric sofa, living room",
    keywordsPlaceholder: "e.g. sofa set under 20000, l shape sofa, wooden sofa india",
  },
  bed: {
    featureBullets: ["e.g. Solid teak wood — 10-year durability guarantee", "e.g. Queen size, fits standard 60x78\" mattress", "e.g. Under-bed hydraulic storage lifts smoothly", "e.g. Padded headboard for comfortable reading", "e.g. Scratch & stain resistant finish", "e.g. Delivered & assembled at your doorstep"],
    inTheBox: ["Bed Frame", "Headboard", "Assembly Kit", "User Manual"],
    brandPlaceholder: "e.g. Wakefit, SleepyCat, IKEA",
    modelPlaceholder: "e.g. Solace Queen, Divan King Storage",
    tagsPlaceholder: "e.g. bed, queen bed, storage bed, wooden bed",
    keywordsPlaceholder: "e.g. queen size bed with storage, wooden bed frame, platform bed india",
  },
  // Appliances
  refrigerator: {
    featureBullets: ["e.g. 5-star energy rated — saves ₹3,000/year on electricity", "e.g. Frost-free with auto defrost technology", "e.g. Inverter compressor — ultra-quiet & durable", "e.g. 235L capacity — ideal for family of 3", "e.g. Multi Airflow keeps every shelf fresh", "e.g. 10-year compressor warranty"],
    inTheBox: ["Refrigerator", "Vegetable Tray", "Egg Tray", "Ice Tray", "User Manual"],
    brandPlaceholder: "e.g. Samsung, LG, Haier, Whirlpool",
    modelPlaceholder: "e.g. RT28T3032S8, GL-D221APZY",
    tagsPlaceholder: "e.g. refrigerator, fridge, double door fridge",
    keywordsPlaceholder: "e.g. 5 star refrigerator, double door fridge under 30000, inverter fridge",
  },
  // Books
  fiction: {
    featureBullets: ["e.g. Gripping narrative — impossible to put down", "e.g. Winner of the Booker Prize 2023", "e.g. Bestselling author with 5M+ copies sold", "e.g. Available in English & Hindi", "e.g. Paperback, 320 pages — lightweight travel read"],
    inTheBox: ["Book (1 Copy)"],
    brandPlaceholder: "e.g. Penguin, HarperCollins, Scholastic",
    modelPlaceholder: "e.g. ISBN 978-0-00-XXXXXX",
    tagsPlaceholder: "e.g. novel, fiction, thriller, romance",
    keywordsPlaceholder: "e.g. bestselling thriller novel, popular fiction books hindi",
  },
  textbook: {
    featureBullets: ["e.g. Strictly as per latest CBSE/JEE syllabus", "e.g. 1500+ solved examples & practice problems", "e.g. Chapter-end summaries & mind maps", "e.g. Colour diagrams for easy understanding", "e.g. Includes 5 previous-year question papers"],
    inTheBox: ["Textbook (1 Copy)"],
    brandPlaceholder: "e.g. NCERT, Arihant, S. Chand",
    modelPlaceholder: "e.g. Class 10 Mathematics 2024 Edition",
    tagsPlaceholder: "e.g. textbook, ncert, jee preparation, cbse",
    keywordsPlaceholder: "e.g. class 12 physics textbook, jee mains preparation book",
  },
  // Sports
  cricket: {
    featureBullets: ["e.g. English Willow Grade 1 — professional grade", "e.g. Ideal for leather ball cricket", "e.g. Full-cane handle, superior grip & flex", "e.g. Pre-oiled & ready to play out of box", "e.g. Weight: 1.1–1.2 kg — balanced pick-up"],
    inTheBox: ["Cricket Bat / Equipment", "Cover / Bag (if applicable)", "Manufacturer Warranty Card"],
    brandPlaceholder: "e.g. SG, SS, Kookaburra, Gray-Nicolls",
    modelPlaceholder: "e.g. SG Players Edition, SS Ton",
    tagsPlaceholder: "e.g. cricket bat, cricket gear, english willow",
    keywordsPlaceholder: "e.g. english willow bat under 5000, cricket kit for kids",
  },
  fitness: {
    featureBullets: ["e.g. Cast iron with rubber coating — no floor scratches", "e.g. Hex shape — won't roll away", "e.g. Knurled grip for firm hold during workout", "e.g. Suitable for home gym & professional use", "e.g. Weight accuracy: ±2% tolerance"],
    inTheBox: ["Fitness Equipment", "User Manual"],
    brandPlaceholder: "e.g. Kore, Lifeline, Kobo, MuscleBlaze",
    modelPlaceholder: "e.g. 5kg Rubber Dumbbell Pair",
    tagsPlaceholder: "e.g. dumbbell, gym equipment, fitness accessories",
    keywordsPlaceholder: "e.g. dumbbell set for home gym, resistance band india, yoga mat thick",
  },
  // Accessories
  phonecase: {
    featureBullets: ["e.g. Military-grade drop protection — tested to 6ft", "e.g. Precise cutouts for all ports & buttons", "e.g. Slim design — adds no bulk to your phone", "e.g. Raised bezels protect screen & camera", "e.g. Wireless & MagSafe charging compatible"],
    inTheBox: ["Phone Case (1 Piece)"],
    brandPlaceholder: "e.g. Spigen, OtterBox, ESR, Stuffcool",
    modelPlaceholder: "e.g. Tough Armor, Defender Series",
    tagsPlaceholder: "e.g. phone case, back cover, iphone case, samsung cover",
    keywordsPlaceholder: "e.g. iphone 15 case, samsung s24 back cover, shockproof case",
  },
  charger: {
    featureBullets: ["e.g. 65W GaN fast charging — full charge in 60 min", "e.g. Universal compatibility — phones, tablets, laptops", "e.g. Smart IC prevents overcharging & overheating", "e.g. Compact size — travel-friendly design", "e.g. USB-C + USB-A dual ports"],
    inTheBox: ["Charger / Cable", "User Manual"],
    brandPlaceholder: "e.g. Anker, Belkin, OnePlus, UGREEN",
    modelPlaceholder: "e.g. 65W GaN Nano, 20W PD",
    tagsPlaceholder: "e.g. fast charger, usb-c charger, type c cable",
    keywordsPlaceholder: "e.g. 65w gan charger india, usb c charging cable 2m",
  },
  // Beauty
  skincare: {
    featureBullets: ["e.g. 2% Niacinamide reduces pores & controls oil", "e.g. Hyaluronic Acid for 72-hour deep hydration", "e.g. Dermatologist-tested, suitable for all skin types", "e.g. Fragrance-free, paraben-free formulation", "e.g. Lightweight, non-greasy — absorbs in seconds"],
    inTheBox: ["Skincare Product (1 Unit)"],
    brandPlaceholder: "e.g. The Ordinary, Minimalist, Dot & Key",
    modelPlaceholder: "e.g. Niacinamide 10% Serum, SPF 50 Sunscreen",
    tagsPlaceholder: "e.g. face serum, moisturiser, sunscreen, skincare",
    keywordsPlaceholder: "e.g. niacinamide serum for oily skin, best sunscreen india, vitamin c serum",
  },
  makeup: {
    featureBullets: ["e.g. 16-hour long-lasting formula", "e.g. Full-coverage, buildable finish", "e.g. Transfer-proof & sweat-resistant", "e.g. Enriched with Vitamin E for lip care", "e.g. Cruelty-free, not tested on animals"],
    inTheBox: ["Makeup Product (1 Unit)"],
    brandPlaceholder: "e.g. Lakme, Maybelline, NYX, Faces Canada",
    modelPlaceholder: "e.g. Matte Lip Colour, HD Foundation",
    tagsPlaceholder: "e.g. lipstick, foundation, kajal, eyeshadow",
    keywordsPlaceholder: "e.g. matte lipstick india, long lasting foundation, best kajal",
  },
};

function getContextualPlaceholders(categoryId?: string, productTypeId?: string) {
  const key = productTypeId || categoryId || "";
  return CATEGORY_PLACEHOLDERS[key] || {
    featureBullets: ["Feature 1 — describe a key benefit", "Feature 2 — highlight unique quality", "Feature 3 — performance or material detail"],
    inTheBox: ["Product (1 Unit)", "User Manual"],
    brandPlaceholder: "e.g. Brand Name",
    modelPlaceholder: "e.g. Model Number / Code",
    tagsPlaceholder: "e.g. tag1, tag2, tag3",
    keywordsPlaceholder: "e.g. search term 1, search term 2, search term 3",
  };
}

// ─── Feature Bullets Editor (Amazon-style) ────────────────────────────────

function FeatureBulletsEditor({
  bullets,
  onChange,
  categoryId,
  productTypeId,
}: {
  bullets: string[];
  onChange: (b: string[]) => void;
  categoryId?: string;
  productTypeId?: string;
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
        <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
          <Zap className="h-3 w-3 text-yellow-500" />
          Key Features
          <span className="ml-1 text-[10px] font-normal text-gray-400">(shown as bullet points on product page)</span>
        </Label>
        <span className="text-[10px] text-gray-400">{bullets.length}/6</span>
      </div>
      <div className="space-y-2">
        {bullets.map((b, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" />
            <Input
              value={b}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => update(i, e.target.value)}
              placeholder={getContextualPlaceholders(categoryId, productTypeId).featureBullets[i] ?? `Feature ${i + 1} — describe a key benefit`}
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

// ─── In-the-Box Editor ────────────────────────────────────────────────────

function InTheBoxEditor({
  items,
  onChange,
  categoryId,
  productTypeId,
}: {
  items: string[];
  onChange: (i: string[]) => void;
  categoryId?: string;
  productTypeId?: string;
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
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
          <Package className="h-3 w-3 text-gray-500" />
          In The Box
        </Label>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => update(i, e.target.value)}
              placeholder={getContextualPlaceholders(categoryId, productTypeId).inTheBox[i] ?? "Item"}
              className="h-9 text-sm flex-1"
            />
            <button type="button" onClick={() => remove(i)} className="text-gray-300 hover:text-red-400 p-1">
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

// ─── Live Preview Card ─────────────────────────────────────────────────────

function PreviewCard({
  name, price, comparePrice, images, bullets, category, productType,
}: {
  name: string; price: number; comparePrice?: number;
  images: string[]; bullets: string[]; category: string; productType: string;
}) {
  const discount = comparePrice && comparePrice > price
    ? Math.round(((comparePrice - price) / comparePrice) * 100)
    : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Thumbnail */}
      <div className="aspect-square bg-gray-50 flex items-center justify-center relative overflow-hidden">
        {images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={images[0]} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-300">
            <ImageIcon className="h-10 w-10" />
            <span className="text-xs">No image</span>
          </div>
        )}
        {discount > 0 && (
          <div className="absolute top-2 left-2 bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            -{discount}%
          </div>
        )}
        {images.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
            +{images.length - 1} more
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-3 space-y-1.5">
        <p className="text-[10px] text-gray-400">{category} › {productType}</p>
        <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">
          {name || <span className="text-gray-300 italic">Product name will appear here…</span>}
        </p>
        <div className="flex items-baseline gap-2">
          {price > 0 ? (
            <>
              <span className="text-base font-bold text-gray-900">₹{price.toLocaleString("en-IN")}</span>
              {comparePrice && comparePrice > price && (
                <span className="text-xs text-gray-400 line-through">₹{comparePrice.toLocaleString("en-IN")}</span>
              )}
            </>
          ) : (
            <span className="text-sm text-gray-300">Price not set</span>
          )}
        </div>
        {bullets.length > 0 && (
          <ul className="space-y-0.5 mt-2">
            {bullets.slice(0, 3).map((b, i) => (
              <li key={i} className="text-[10px] text-gray-600 flex items-start gap-1">
                <span className="text-blue-400 mt-0.5">•</span>
                <span className="line-clamp-1">{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Section Wrapper ───────────────────────────────────────────────────────

function Section({
  title, subtitle, children, collapsible = false, defaultOpen = true,
}: {
  title: string; subtitle?: string; children: React.ReactNode;
  collapsible?: boolean; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        type="button"
        className={`w-full flex items-center justify-between px-5 py-4 text-left ${collapsible ? "hover:bg-gray-50 transition-colors" : ""}`}
        onClick={() => collapsible && setOpen((o: boolean) => !o)}
        disabled={!collapsible}
      >
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {collapsible && (
          open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>
      {open && <div className="px-5 pb-5 space-y-4 border-t border-gray-100">{children}</div>}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export function AddProductClient() {
  const router = useRouter();
  const [activeChoice, setActiveChoice] = useState<boolean | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [loading, setLoading] = useState(false);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);

  // Step 1 & 2
  const [selectedCategory, setSelectedCategory] = useState<CategoryConfig | null>(null);
  const [selectedProductType, setSelectedProductType] = useState<ProductType | null>(null);

  // Step 3/4/5 state
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [specValues, setSpecValues] = useState<Record<string, string>>({});
  const [hasVariants, setHasVariants] = useState(false);
  const [variantRows, setVariantRows] = useState<ComboVariantRow[]>([]);
  // Whether the storefront card's variant picker (size/color dropdown) shows
  // for this product once it's live. Defaults to true (current behaviour).
  const [showVariantsOnCard, setShowVariantsOnCard] = useState(true);
  const [colorImages, setColorImages] = useState<Record<string, { front?: string; back?: string }>>({});
  const [colorUploadLoading, setColorUploadLoading] = useState<Record<string, boolean>>({});
  const [colorDragOver, setColorDragOver] = useState<string | null>(null);
  const [cardDesignValue, setCardDesignValue] = useState<string>(DEFAULT_CARD_DESIGN);
  const [cardFontValue, setCardFontValue] = useState<string>(DEFAULT_CARD_FONT);
  // Focal point for the cover photo's storefront crop — "X% Y%", or "" for
  // center (default). Set by dragging in ImagePositionPicker.
  const [imagePositionValue, setImagePositionValue] = useState<string>("");

  // "Live preview" button in the header — shows this product's real card
  // (store name, price/offer %, variants, everything) exactly as it'll
  // render on the storefront, using the same ProductCard component and the
  // form's live values. Store name is fetched once on mount since it isn't
  // otherwise available in this form.
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewStoreName, setPreviewStoreName] = useState("Your Store");
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    fetch("/api/sellers/profile", { headers: { Authorization: `Bearer ${uid}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.storeName) setPreviewStoreName(data.storeName); })
      .catch(() => {});
  }, []);

  // Controlled field states — bypasses react-hook-form DOM tracking issues
  const [nameValue, setNameValue] = useState("");
  const [descValue, setDescValue] = useState("");
  const [priceValue, setPriceValue] = useState("");
  const [comparePriceValue, setComparePriceValue] = useState("");
  const [stockValue, setStockValue] = useState("");

  // Amazon/Flipkart-style enriched fields
  const [featureBullets, setFeatureBullets] = useState<string[]>([""]);
  const [inTheBox, setInTheBox] = useState<string[]>([""]);
  const [warranty, setWarranty] = useState("");
  const [warrantyType, setWarrantyType] = useState("");
  const [brand, setBrand] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [countryOfOrigin, setCountryOfOrigin] = useState("India");
  const [searchKeywords, setSearchKeywords] = useState("");
  const [deliveryInfoValue, setDeliveryInfoValue] = useState("");
  const [gstRateValue, setGstRateValue] = useState("");
  const [hsnCodeValue, setHsnCodeValue] = useState("");

  // Step 6 — Offers state
  type OfferType = "BUY_X_GET_Y" | "PERCENT_OFF" | "FLAT_OFF" | "FREE_SHIPPING" | "CUSTOM";
  interface OfferDraft {
    label: string;
    description: string;
    offerType: OfferType;
    discountVal: string;
    buyQty: string;
    getQty: string;
  }
  const BLANK_OFFER: OfferDraft = { label: "", description: "", offerType: "CUSTOM", discountVal: "", buyQty: "", getQty: "" };
  const [offers, setOffers] = useState<OfferDraft[]>([]);
  const [offerLoading, setOfferLoading] = useState(false);

  const {
    handleSubmit,
    setValue,
    watch,
    clearErrors,
    formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      stock: 0, isActive: true, isFeatured: false, tags: [], images: [], condition: "ORIGINAL",
      cardDisplayText: "",
    },
  });

  const isFeatured = watch("isFeatured");
  // Manual override for what shows on THIS product's storefront card — see
  // ProductCard.tsx. Blank means "auto" (name + description, unchanged).
  const cardDisplayText = watch("cardDisplayText");

  // Keep price/stock form fields valid when variants are enabled, since the
  // base price/stock inputs are hidden in that case and never call setValue.
  useEffect(() => {
    if (!hasVariants) return;
    if (variantRows.length > 0) {
      const validPrices = variantRows
        .map((v) => parseFloat(v.price))
        .filter((p) => !isNaN(p) && p > 0);
      const computedPrice = validPrices.length > 0 ? Math.min(...validPrices) : (parseFloat(priceValue) || 1);
      const computedStock = variantRows.reduce((s, v) => s + (parseInt(v.stock || "0", 10) || 0), 0);
      setValue("price", computedPrice);
      setValue("stock", computedStock);
    } else {
      setValue("price", parseFloat(priceValue) || 1);
      setValue("stock", parseInt(stockValue, 10) || 0);
    }
    clearErrors(["price", "stock"]);
  }, [hasVariants, variantRows, priceValue, stockValue, setValue, clearErrors]);

  // Derive display values from controlled state
  const watchedName = nameValue;
  const watchedDesc = descValue;
  const watchedPrice = parseFloat(priceValue) || 0;
  const watchedComparePrice = parseFloat(comparePriceValue) || undefined;

  // Listing quality checks
  const qualityChecks = [
    { label: "Product name (50+ chars)", done: nameValue.length >= 50 },
    { label: "Description (100+ chars)", done: descValue.length >= 100 },
    { label: "At least 3 images", done: imageUrls.length >= 3 },
    { label: "At least 3 feature bullets", done: featureBullets.filter(Boolean).length >= 3 },
    { label: "Compare price set (shows discount)", done: !!comparePriceValue && parseFloat(comparePriceValue) > parseFloat(priceValue || "0") },
    { label: "Specifications filled", done: Object.values(specValues).filter(Boolean).length >= 2 },
    { label: "In-the-box items listed", done: inTheBox.filter(Boolean).length >= 1 },
    { label: "Brand name provided", done: brand.trim().length > 0 },
  ];
  const qualityScore = Math.round((qualityChecks.filter((c) => c.done).length / qualityChecks.length) * 100);

  const handleCategorySelect = (cat: CategoryConfig) => {
    setSelectedCategory(cat);
    setSelectedProductType(null);
    setSpecValues({});
    setStep(2);
  };

  const handleProductTypeSelect = (pt: ProductType) => {
    setSelectedProductType(pt);
    setSpecValues({});
    setVariantRows([]);
    setStep(3);
  };

  const handleImagesChange = (urls: string[]) => {
    setImageUrls(urls);
    setValue("images", urls);
    if (urls.length > 0) clearErrors("images");
  };

  const onSubmit = async (data: ProductInput) => {
    if (hasVariants) {
      const invalid = variantRows.some((v: ComboVariantRow) => !v.stock.trim());
      if (invalid) { toast.error("Fill in all stock amounts for variants"); return; }
    }

    setLoading(true);
    try {
      const token = auth.currentUser?.uid ?? undefined;

      const payload = {
        ...data,
        categorySlug: selectedCategory?.slug,
        productTypeId: selectedProductType?.id,
        cardDesign: cardDesignValue,
        cardFont: cardFontValue,
        cardImagePosition: imagePositionValue || undefined,
        showVariantsOnCard,
        specifications: specValues,
        deliveryInfo: deliveryInfoValue.trim() || undefined,
        gstRate: gstRateValue !== "" ? parseFloat(gstRateValue) : undefined,
        hsnCode: hsnCodeValue.trim() || undefined,
        // Enriched fields
        featureBullets: featureBullets.filter(Boolean),
        inTheBox: inTheBox.filter(Boolean),
        warranty,
        warrantyType,
        brand,
        modelNumber,
        countryOfOrigin,
        searchKeywords: searchKeywords.split(",").map((s: string) => s.trim()).filter(Boolean),
        ...(Object.keys(colorImages).length > 0 ? { variantImages: colorImages } : {}),
        ...(hasVariants && variantRows.length > 0
          ? {
              price: Math.min(...variantRows.map((v: ComboVariantRow) => parseFloat(v.price || "0") || parseFloat(String(data.price)))),
              stock: variantRows.reduce((sum: number, v: ComboVariantRow) => sum + parseInt(v.stock || "0"), 0),
            }
          : {}),
      };

      const res = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        let errorMsg = "Failed to create product";
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorMsg;
        } catch {
          errorMsg = `HTTP ${res.status}: ${res.statusText}`;
        }
        throw new Error(errorMsg);
      }
      
      const result = await res.json();
      if (!result || !result.id) throw new Error("Invalid response from server");


      if (hasVariants && variantRows.length > 0) {
        const bulkRes = await fetch("/api/products/variants/bulk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            productId: result.id,
            deleteExisting: false,
            variants: variantRows.map((v: ComboVariantRow) => ({
              combo: v.combo,
              price: v.price ? parseFloat(v.price) : null,
              comparePrice: v.comparePrice ? parseFloat(v.comparePrice) : null,
              stock: parseInt(v.stock || "0"),
            })),
          }),
        });
        if (!bulkRes.ok) {
          const err = await bulkRes.json();
          throw new Error(err.error ?? "Failed to save variants");
        }
      }

      toast.success("Product created successfully!");
      // The products list caches its data in localStorage for 5 minutes
      // (see PROD_KEY in that page). Without clearing it here, going back
      // to the list right after this (every path off the next step does)
      // would show the old, pre-creation list — this new product would
      // look like it silently failed to save.
      try { localStorage.removeItem("nxc-prods-v1"); } catch {}
      setCreatedProductId(result.id);
      setStep(6);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const onInvalid = (errors: FieldErrors<ProductInput>) => {
    const keys = Object.keys(errors);
    const firstMsg = (Object.values(errors)[0] as { message?: string })?.message;

    // price/stock errors only matter for Step 3 when NOT using variants
    const step3CoreFields = ["name", "description", "condition"];
    const step3PriceFields = ["price", "stock", "comparePrice"];
    const step5Fields = ["images"];

    const hasStep3Core = keys.some((k) => step3CoreFields.includes(k));
    const hasStep3Price = !hasVariants && keys.some((k) => step3PriceFields.includes(k));

    if (hasStep3Core || hasStep3Price) {
      setStep(3);
      toast.error(firstMsg || "Please fill in all required fields in Basic Info");
    } else if (keys.some((k) => step5Fields.includes(k))) {
      toast.error(firstMsg || "At least one product image is required");
    } else {
      toast.error(firstMsg || "Please fill in all required fields before publishing");
    }
  };

  // ── Pre-step: Active / Inactive choice ────────────────────────────────
  if (activeChoice === null) return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 lg:gap-4 mb-8">
        <Link href="/dashboard/products">
          <Button variant="ghost" size="icon" className="h-8 w-8 lg:h-10 lg:w-10"><ArrowLeft className="h-4 w-4 lg:h-5 lg:w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-xl lg:text-3xl font-semibold text-gray-900">Add New Product</h1>
          <p className="text-xs lg:text-sm text-gray-500">Before we start — choose the listing status</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 lg:p-8 space-y-6">
        <div className="space-y-1">
          <h2 className="text-base lg:text-lg font-semibold text-gray-900">Should this product be visible to customers?</h2>
          <p className="text-xs lg:text-sm text-gray-500">You can change this anytime from the products list.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Active */}
          <button
            type="button"
            onClick={() => {
              setValue("isActive", true);
              setActiveChoice(true);
            }}
            className="group flex flex-col items-start gap-3 rounded-2xl border-2 border-gray-200 bg-white p-5 text-left transition-all hover:border-blue-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors">
              <Globe className="h-5 w-5 text-blue-600" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-gray-900">Active</p>
              <p className="text-xs text-gray-500 leading-relaxed">Product goes live immediately — visible to all customers on your store and the main website.</p>
            </div>
            <span className="mt-auto inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-600">
              <CheckCircle2 className="h-3 w-3" /> Visible to customers
            </span>
          </button>

          {/* Inactive */}
          <button
            type="button"
            onClick={() => {
              setValue("isActive", false);
              setActiveChoice(false);
            }}
            className="group flex flex-col items-start gap-3 rounded-2xl border-2 border-gray-200 bg-white p-5 text-left transition-all hover:border-gray-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 group-hover:bg-gray-200 transition-colors">
              <EyeOff className="h-5 w-5 text-gray-500" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-gray-900">Inactive</p>
              <p className="text-xs text-gray-500 leading-relaxed">Saved as a draft — hidden from customers until you decide to activate it. Great for preparing flash sale products.</p>
            </div>
            <span className="mt-auto inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-500">
              <EyeOff className="h-3 w-3" /> Hidden from customers
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  // ── Step 1 ─────────────────────────────────────────────────────────────
  if (step === 1) return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 lg:gap-4 mb-6 lg:mb-8">
        <Button variant="ghost" size="icon" className="h-8 w-8 lg:h-10 lg:w-10" onClick={() => setActiveChoice(null)}>
          <ArrowLeft className="h-4 w-4 lg:h-5 lg:w-5" />
        </Button>
        <div>
          <h1 className="text-xl lg:text-3xl font-semibold text-gray-900">Add New Product</h1>
          <p className="text-xs lg:text-sm text-gray-500">Start by selecting the right category</p>
        </div>
      </div>
      <StepBar step={1} />
      <CategorySelector onSelect={handleCategorySelect} />
    </div>
  );

  // ── Step 2 ─────────────────────────────────────────────────────────────
  if (step === 2 && selectedCategory) return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 lg:gap-4 mb-6 lg:mb-8">
        <Button variant="ghost" size="icon" className="h-8 w-8 lg:h-10 lg:w-10" onClick={() => setStep(1)}>
          <ArrowLeft className="h-4 w-4 lg:h-5 lg:w-5" />
        </Button>
        <div>
          <h1 className="text-xl lg:text-3xl font-semibold text-gray-900">Select Product Type</h1>
          <p className="text-xs lg:text-sm text-gray-500">{selectedCategory.icon} {selectedCategory.label}</p>
        </div>
      </div>
      <StepBar step={2} />
      <ProductTypeSelector category={selectedCategory} onSelect={handleProductTypeSelect} onBack={() => setStep(1)} />
    </div>
  );

  // ── Steps 3–5 (multi-section form) ────────────────────────────────────
  if (!selectedCategory || !selectedProductType) return null;

  const stepTitles: Record<number, string> = {
    3: "Basic Information",
    4: "Specifications & Details",
    5: "Images & Variants",
    6: "Product Offers",
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setStep(step === 3 ? 2 : (step - 1) as 3 | 4)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-gray-900">{stepTitles[step]}</h1>
          <nav className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
            <button type="button" onClick={() => setStep(1)} className="hover:text-gray-600">{selectedCategory.icon} {selectedCategory.label}</button>
            <span>/</span>
            <button type="button" onClick={() => setStep(2)} className="hover:text-gray-600">{selectedProductType.icon} {selectedProductType.label}</button>
            <span>/</span>
            <span className="text-gray-600">{stepTitles[step]}</span>
          </nav>
        </div>
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 active:scale-95"
        >
          <Eye className="h-3.5 w-3.5" />
          Live preview
        </button>
      </div>

      {/* Live preview dialog — the real ProductCard, fed the form's current
          values, so what a seller sees here is exactly what shoppers will
          see: store name, price + discount %, variants, everything. */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Live preview</DialogTitle>
          </DialogHeader>
          <div className="mx-auto w-[220px]">
            <ProductCard
              id="preview"
              productId="preview"
              name={nameValue || "Your product name"}
              price={parseFloat(priceValue) || 0}
              comparePrice={comparePriceValue ? parseFloat(comparePriceValue) : undefined}
              image={imageUrls[0] ?? ""}
              rating={0}
              reviewCount={0}
              sellerId="preview"
              sellerName={previewStoreName}
              stock={hasVariants
                ? variantRows.reduce((sum, v) => sum + (parseInt(v.stock || "0", 10) || 0), 0)
                : (parseInt(stockValue, 10) || 0)}
              cardDesign={cardDesignValue}
              cardFont={cardFontValue}
              cardDisplayText={cardDisplayText}
              cardImagePosition={imagePositionValue}
              variants={hasVariants
                ? variantRows.map((v) => ({
                    id: v.id,
                    name: "Variant",
                    value: JSON.stringify(v.combo),
                    price: v.price ? parseFloat(v.price) : undefined,
                    stock: parseInt(v.stock || "0", 10) || 0,
                  }))
                : []}
              previewMobileHeight
            />
          </div>
        </DialogContent>
      </Dialog>

      <StepBar step={step} />

      <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

          {/* ── Main Content ── */}
          <div className="xl:col-span-3 space-y-5">

            {/* STEP 3 — Basic Info */}
            <div className={step === 3 ? "space-y-5" : "hidden"}>
                {/* Product Identity */}
                <Section title="Product Identity" subtitle="Core details that identify your product">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs font-medium text-gray-700">
                        Product Title <span className="text-red-500">*</span>
                        <span className="ml-1 text-[10px] font-normal text-gray-400">
                          (aim for 80–150 chars — include brand, model, key specs)
                        </span>
                      </Label>
                      <Input
                        value={nameValue}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setNameValue(e.target.value);
                          setValue("name", e.target.value);
                        }}
                        placeholder={`e.g. ${selectedProductType.label} — Brand Model Number, Key Spec 1, Key Spec 2, Color`}
                        className="h-10 text-sm"
                      />
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] ml-auto ${watchedName.length >= 50 ? "text-green-600" : "text-gray-400"}`}>
                          {watchedName.length} chars
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-700">Brand Name <span className="text-red-500">*</span></Label>
                      <Input value={brand} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBrand(e.target.value)} placeholder={getContextualPlaceholders(selectedCategory?.id, selectedProductType?.id).brandPlaceholder} className="h-9 text-sm" />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-700">Model Number</Label>
                      <Input value={modelNumber} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModelNumber(e.target.value)} placeholder={getContextualPlaceholders(selectedCategory?.id, selectedProductType?.id).modelPlaceholder} className="h-9 text-sm" />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-700">Country of Origin</Label>
                      <Select value={countryOfOrigin} onValueChange={setCountryOfOrigin}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["India", "China", "USA", "Japan", "South Korea", "Taiwan", "Germany", "Other"].map((c) => (
                            <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-700">Condition <span className="text-red-500">*</span></Label>
                      <Select defaultValue="ORIGINAL" onValueChange={(value) => setValue("condition", value as "ORIGINAL" | "REFURBISHED" | "BOX_OPEN")}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ORIGINAL" className="text-sm">Original (New)</SelectItem>
                          <SelectItem value="REFURBISHED" className="text-sm">Refurbished</SelectItem>
                          <SelectItem value="BOX_OPEN" className="text-sm">Box Open</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-700">Tags <span className="text-[10px] font-normal text-gray-400">(comma-separated)</span></Label>
                      <Input
                        placeholder={getContextualPlaceholders(selectedCategory?.id, selectedProductType?.id).tagsPlaceholder}
                        className="h-9 text-sm"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue("tags", e.target.value.split(",").map((t: string) => t.trim()).filter(Boolean))}
                      />
                    </div>
                  </div>
                </Section>

                {/* Description */}
                <Section title="Product Description" subtitle="Helps customers understand your product and improves search ranking">
                  <div className="pt-2 space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-700">
                        Description <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        value={descValue}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                          setDescValue(e.target.value);
                          setValue("description", e.target.value);
                        }}
                        placeholder="Write a detailed description covering what the product does, who it's for, and why it's worth buying. Avoid copying the spec list — this should be conversational and helpful."
                        rows={6}
                        className="text-sm resize-none"
                      />
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] ml-auto ${watchedDesc.length >= 100 ? "text-green-600" : "text-gray-400"}`}>
                          {watchedDesc.length} chars
                        </span>
                      </div>
                    </div>
                    <FeatureBulletsEditor bullets={featureBullets} onChange={setFeatureBullets} categoryId={selectedCategory?.id} productTypeId={selectedProductType?.id} />
                  </div>
                </Section>

                {/* Pricing */}
                <Section title="Pricing" subtitle="Set competitive pricing — showing a discount increases conversions">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                    {!hasVariants && (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-gray-700">Selling Price (₹) <span className="text-red-500">*</span></Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₹</span>
                            <Input
                              type="number" step="0.01"
                              value={priceValue}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setPriceValue(e.target.value);
                                setValue("price", parseFloat(e.target.value) || 0);
                              }}
                              placeholder="0"
                              className="h-9 text-sm pl-7"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-gray-700">MRP / Compare Price (₹)</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₹</span>
                            <Input
                              type="number" step="0.01"
                              value={comparePriceValue}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setComparePriceValue(e.target.value);
                                const n = parseFloat(e.target.value);
                                setValue("comparePrice", isNaN(n) ? undefined : n);
                              }}
                              placeholder="0"
                              className="h-9 text-sm pl-7"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-gray-700">Stock <span className="text-red-500">*</span></Label>
                          <Input
                            type="number"
                            value={stockValue}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              setStockValue(e.target.value);
                              setValue("stock", parseInt(e.target.value) || 0);
                            }}
                            placeholder="0"
                            className="h-9 text-sm"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  {/* GST details */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-700">GST Rate (%)</Label>
                      <select
                        value={gstRateValue}
                        onChange={(e) => setGstRateValue(e.target.value)}
                        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                      <Label className="text-xs font-medium text-gray-700">HSN Code</Label>
                      <Input
                        value={hsnCodeValue}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHsnCodeValue(e.target.value)}
                        placeholder="e.g. 6109"
                        maxLength={15}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Optional — used to generate accurate GST invoices for this product.</p>
                  {/* Discount badge preview */}
                  {watchedComparePrice && watchedPrice && watchedComparePrice > watchedPrice && (
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className="bg-green-600 text-white text-xs">
                        -{Math.round(((watchedComparePrice - watchedPrice) / watchedComparePrice) * 100)}% off
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Customers save ₹{(watchedComparePrice - watchedPrice).toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                </Section>

                {/* Delivery Info */}
                <Section title="Delivery Info" subtitle="Optional — shown on product cards (e.g. Free Delivery over ₹800, Free Delivery, COD Available)">
                  <div className="pt-2 space-y-1.5">
                    <Input
                      value={deliveryInfoValue}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeliveryInfoValue(e.target.value)}
                      placeholder="e.g. Free Delivery over ₹800"
                      maxLength={100}
                      className="h-9 text-sm"
                    />
                    <p className="text-[10px] text-gray-400">Leave blank to show nothing. Customers see this on every product card.</p>
                  </div>
                </Section>

                {/* Search Keywords */}
                <Section title="Search Keywords" subtitle="Hidden keywords that improve discoverability" collapsible defaultOpen={false}>
                  <div className="pt-2 space-y-1.5">
                    <Label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                      <Tag className="h-3 w-3 text-gray-400" />
                      Search Terms <span className="text-[10px] font-normal text-gray-400">(comma-separated, not shown to customers)</span>
                    </Label>
                    <Textarea
                      value={searchKeywords}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSearchKeywords(e.target.value)}
                      placeholder={getContextualPlaceholders(selectedCategory?.id, selectedProductType?.id).keywordsPlaceholder}
                      rows={3}
                      className="text-sm resize-none"
                    />
                  </div>
                </Section>
            </div>

            {/* STEP 4 — Specifications */}
            <div className={step === 4 ? "space-y-5" : "hidden"}>
                {selectedProductType.specFields.length > 0 && (
                  <Section title="Technical Specifications" subtitle="Shown in the specs table on your product page — customers filter by these">
                    <div className="pt-2">
                      <SpecFields
                        fields={selectedProductType.specFields}
                        values={specValues}
                        onChange={(key: string, val: string) => setSpecValues((p: Record<string, string>) => ({ ...p, [key]: val }))}
                      />
                    </div>
                  </Section>
                )}

                {/* Warranty */}
                <Section title="Warranty & Service">
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-700">Warranty Duration</Label>
                      <Select value={warranty} onValueChange={setWarranty}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select warranty" /></SelectTrigger>
                        <SelectContent>
                          {["No Warranty", "3 Months", "6 Months", "1 Year", "2 Years", "3 Years", "Lifetime"].map((w) => (
                            <SelectItem key={w} value={w} className="text-sm">{w}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-700">Warranty Type</Label>
                      <Select value={warrantyType} onValueChange={setWarrantyType}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          {["Manufacturer Warranty", "Seller Warranty", "Brand Warranty", "International Warranty"].map((t) => (
                            <SelectItem key={t} value={t} className="text-sm">{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Section>

                {/* In The Box */}
                <Section title="What's In The Box" subtitle="List every item included in the package">
                  <div className="pt-2">
                    <InTheBoxEditor items={inTheBox} onChange={setInTheBox} categoryId={selectedCategory?.id} productTypeId={selectedProductType?.id} />
                  </div>
                </Section>
            </div>

            {/* STEP 5 — Images & Variants */}
            <div className={step === 5 ? "space-y-5" : "hidden"}>
                <Section title="Product Images" subtitle="First image is the cover. Min 3 images recommended — use clean white background shots.">
                  <div className="pt-2">
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-700">
                        Use high-res images (min 1000×1000px). Include: front, back, side, in-use, and close-up detail shots. Products with 6+ images get 40% more clicks.
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
                    {errors.images && <p className="text-xs text-red-500 mt-1">{errors.images.message}</p>}
                    {imageUrls.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        {imageUrls.length} image{imageUrls.length > 1 ? "s" : ""} uploaded. Drag to reorder — first image is the cover.
                      </p>
                    )}
                  </div>
                </Section>

                {/* Variants */}
                <Section title="Product Variants" subtitle={`Add different ${selectedProductType.variantTypes.join(", ") || "options"} for this product`}>
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-4">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-gray-800">Enable Variants</p>
                        <p className="text-xs text-gray-500">Turn on to sell different configurations at different prices/stock</p>
                      </div>
                      <Switch
                        checked={hasVariants}
                        onCheckedChange={setHasVariants}
                      />
                    </div>

                    {hasVariants && (
                      <>
                        <VariantManager
                          variantTypes={selectedProductType.variantTypes}
                          rows={variantRows}
                          onRowsChange={setVariantRows}
                          specValues={specValues}
                          specFields={selectedProductType.specFields}
                          basePrice={priceValue}
                          baseComparePrice={comparePriceValue}
                          baseStock={stockValue}
                          categoryId={selectedCategory?.id}
                          productTypeId={selectedProductType?.id}
                        />

                        <div className="flex items-center justify-between mt-4 mb-2 pt-4 border-t border-gray-100">
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium text-gray-800">Show Variants on Product Card</p>
                            <p className="text-xs text-gray-500">Let shoppers pick a size/colour right from the card. Turn off to keep the card clean — they&apos;ll choose on the product page instead.</p>
                          </div>
                          <Switch
                            checked={showVariantsOnCard}
                            onCheckedChange={setShowVariantsOnCard}
                          />
                        </div>

                        {/* ── Colour Front & Back Images ── */}
                        {(() => {
                          const SWATCHES: Record<string,string> = {black:"#111827",white:"#f9fafb",red:"#ef4444",blue:"#3b82f6",green:"#22c55e",yellow:"#eab308",purple:"#a855f7",pink:"#ec4899",orange:"#f97316",gray:"#6b7280",grey:"#6b7280",navy:"#1e3a5f",brown:"#92400e",teal:"#14b8a6",silver:"#94a3b8",rose:"#f43f5e",coral:"#ff7f7f",maroon:"#7f1d1d",lime:"#84cc16",sky:"#0ea5e9"};
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
                              const token = auth.currentUser?.uid ?? undefined;
                              const r = await fetch("/api/upload", { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
                              if (!r.ok) throw new Error("Upload failed");
                              const { url } = await r.json();
                              setColorImages(p => ({ ...p, [color]: { ...(p[color] ?? {}), [side]: url } }));
                            } catch { toast.error("Image upload failed"); }
                            finally { setColorUploadLoading(p => ({ ...p, [loadKey]: false })); }
                          };

                          return (
                            <div className="rounded-xl border border-border/50 p-4 space-y-4 mt-4">
                              <div>
                                <h3 className="text-[13px] font-semibold text-gray-800">🎨 Colour Images — Front & Back</h3>
                                <p className="text-[11px] text-gray-500 mt-0.5">Upload separate Front and Back photos for each colour so customers see the right view when they pick a colour.</p>
                              </div>
                              <div className="space-y-4">
                                {colorValues.map(color => {
                                  const ci = colorImages[color] ?? {};
                                  return (
                                    <div key={color} className="rounded-lg border border-gray-200 p-3 space-y-2.5 bg-gray-50">
                                      <div className="flex items-center gap-2">
                                        <span className="inline-block h-4 w-4 rounded-full border border-gray-300 shrink-0" style={{ background: swCol(color) }} />
                                        <span className="text-[12px] font-bold text-gray-800">{color}</span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-3">
                                        {(["front","back"] as const).map(side => {
                                          const url = ci[side];
                                          const loadKey = `${color}-${side}`;
                                          const loading = colorUploadLoading[loadKey];
                                          return (
                                            <div key={side} className="space-y-1.5">
                                              <p className="text-[11px] font-semibold text-gray-500 capitalize">{side} View</p>
                                              {url ? (
                                                <div className="relative group">
                                                  <img src={url} alt={`${color} ${side}`} className="h-20 w-full rounded-lg object-cover border border-gray-200" />
                                                  <button type="button" onClick={() => setColorImages(p => { const cp = { ...p }; if (cp[color]) { const ci2 = { ...cp[color] }; delete ci2[side]; cp[color] = ci2; } return cp; })} className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center rounded-full bg-red-500/80 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                                                </div>
                                              ) : (
                                                <div
                                                  className={`flex flex-col items-center justify-center h-20 rounded-lg border-2 border-dashed transition-all cursor-pointer select-none
                                                    ${loading ? "opacity-60 pointer-events-none" : ""}
                                                    ${colorDragOver === loadKey ? "border-blue-500 bg-blue-50 scale-[1.02]" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50"}
                                                  `}
                                                  onClick={() => { if (!loading) (document.getElementById(`cimg-${loadKey}`) as HTMLInputElement)?.click(); }}
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
                                                  <input id={`cimg-${loadKey}`} type="file" accept="image/*" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) uploadColorImg(color, side, f); e.target.value = ""; }} />
                                                  {loading
                                                    ? <span className="text-[11px] text-gray-400">Uploading…</span>
                                                    : colorDragOver === loadKey
                                                      ? <><span className="text-[18px]">📂</span><span className="text-[10px] text-blue-500 mt-1 font-medium">Drop to upload</span></>
                                                      : <><span className="text-[18px]">📷</span><span className="text-[10px] text-gray-400 mt-1">Drag or click to upload {side}</span></>
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
                      </>
                    )}
                  </div>
                </Section>

                {/* Card Design */}
                <Section title="Product Card Design" subtitle="Choose how this product's card looks on your storefront and in search.">
                  <div className="pt-2">
                    <ProductDesignPicker
                      value={cardDesignValue}
                      onChange={setCardDesignValue}
                      fontValue={cardFontValue}
                      onFontChange={setCardFontValue}
                      previewName={nameValue}
                      previewPrice={watchedPrice}
                      previewComparePrice={watchedComparePrice}
                      previewImage={imageUrls[0] ?? ""}
                      previewStock={stockValue.trim() === "" ? undefined : parseInt(stockValue, 10)}
                      imagePosition={imagePositionValue}
                      onImagePositionChange={setImagePositionValue}
                    />
                  </div>
                </Section>
            </div>

            {/* STEP 6 — Offers */}
            <div className={step === 6 ? "space-y-5" : "hidden"}>
                <Section title="Product Offers" subtitle="Add offers that will appear on your product page — like bank discounts, cashback, EMI options, etc.">
                  <div className="pt-2 space-y-4">
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-700">
                        These offers appear in the <strong>Offers carousel</strong> on your product page, just like on Amazon. Add up to 6 offers. Customers see 2–3 at a time and can scroll through them.
                      </p>
                    </div>

                    {/* Offer list */}
                    {offers.map((offer, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50 relative">
                        <button
                          type="button"
                          onClick={() => setOffers((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-3 right-3 h-6 w-6 flex items-center justify-center rounded-full bg-gray-200 hover:bg-red-100 hover:text-red-600 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>

                        {/* Offer Type */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-gray-700">Offer Type</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {([
                              { value: "CUSTOM",       label: "Custom / Bank Offer", icon: CreditCard },
                              { value: "PERCENT_OFF",  label: "% Discount",          icon: Percent },
                              { value: "FLAT_OFF",     label: "Flat Amount Off",     icon: Wallet },
                              { value: "FREE_SHIPPING",label: "Free Shipping",       icon: TruckIcon },
                              { value: "BUY_X_GET_Y",  label: "Buy X Get Y Free",    icon: Gift },
                            ] as { value: OfferType; label: string; icon: React.FC<{className?: string}> }[]).map(({ value, label, icon: Icon }) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setOffers((prev) => prev.map((o, i) => i === idx ? { ...o, offerType: value } : o))}
                                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                                  offer.offerType === value
                                    ? "border-blue-500 bg-blue-50 text-blue-700"
                                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                                }`}
                              >
                                <Icon className="h-3 w-3 shrink-0" />
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Label */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-gray-700">
                            Offer Label <span className="text-red-500">*</span>
                          </label>
                          <Input
                            value={offer.label}
                            onChange={(e) => setOffers((prev) => prev.map((o, i) => i === idx ? { ...o, label: e.target.value } : o))}
                            placeholder={
                              offer.offerType === "CUSTOM"        ? "e.g. Bank Offer" :
                              offer.offerType === "PERCENT_OFF"   ? "e.g. 10% Off" :
                              offer.offerType === "FLAT_OFF"      ? "e.g. Flat ₹200 Off" :
                              offer.offerType === "FREE_SHIPPING" ? "Free Delivery" :
                              "Buy X Get Y Free"
                            }
                            className="h-8 text-xs"
                          />
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-gray-700">
                            Description <span className="text-red-500">*</span>
                            <span className="text-gray-400 font-normal ml-1">(shown to customers)</span>
                          </label>
                          <Input
                            value={offer.description}
                            onChange={(e) => setOffers((prev) => prev.map((o, i) => i === idx ? { ...o, description: e.target.value } : o))}
                            placeholder={
                              offer.offerType === "CUSTOM"        ? "e.g. 10% Instant Discount up to ₹1,500 on HDFC Credit Cards. Min purchase ₹5,000." :
                              offer.offerType === "PERCENT_OFF"   ? "e.g. Get 10% off on this product. No minimum order." :
                              offer.offerType === "FLAT_OFF"      ? "e.g. Flat ₹200 off on orders above ₹999." :
                              offer.offerType === "FREE_SHIPPING" ? "e.g. Free delivery on all orders above ₹499." :
                              "e.g. Buy 3, get 1 free. Add 4 to cart."
                            }
                            className="h-8 text-xs"
                          />
                        </div>

                        {/* Conditional numeric fields */}
                        {(offer.offerType === "PERCENT_OFF" || offer.offerType === "FLAT_OFF") && (
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-700">
                              {offer.offerType === "PERCENT_OFF" ? "Discount %" : "Flat Discount (₹)"}
                            </label>
                            <Input
                              type="number"
                              value={offer.discountVal}
                              onChange={(e) => setOffers((prev) => prev.map((o, i) => i === idx ? { ...o, discountVal: e.target.value } : o))}
                              placeholder={offer.offerType === "PERCENT_OFF" ? "e.g. 10" : "e.g. 200"}
                              className="h-8 text-xs w-32"
                            />
                          </div>
                        )}

                        {offer.offerType === "BUY_X_GET_Y" && (
                          <div className="flex items-center gap-3">
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-gray-700">Buy Qty</label>
                              <Input
                                type="number"
                                value={offer.buyQty}
                                onChange={(e) => setOffers((prev) => prev.map((o, i) => i === idx ? { ...o, buyQty: e.target.value } : o))}
                                placeholder="3"
                                className="h-8 text-xs w-20"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-gray-700">Get Qty Free</label>
                              <Input
                                type="number"
                                value={offer.getQty}
                                onChange={(e) => setOffers((prev) => prev.map((o, i) => i === idx ? { ...o, getQty: e.target.value } : o))}
                                placeholder="1"
                                className="h-8 text-xs w-20"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add offer button */}
                    {offers.length < 6 && (
                      <button
                        type="button"
                        onClick={() => setOffers((prev) => [...prev, { ...BLANK_OFFER }])}
                        className="flex items-center gap-2 w-full rounded-xl border-2 border-dashed border-gray-200 py-3 px-4 text-xs font-medium text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        Add Offer {offers.length > 0 ? `(${offers.length}/6)` : ""}
                      </button>
                    )}

                    {offers.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-2">
                        No offers added. Click &quot;Add Offer&quot; above, or skip to publish without offers.
                      </p>
                    )}
                  </div>
                </Section>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((s: 1 | 2 | 3 | 4 | 5 | 6) => Math.max(3, s - 1) as 3 | 4 | 5)}
                disabled={step === 3 || step === 6}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {step < 5 ? (
                <Button
                  type="button"
                  onClick={() => setStep((s: 1 | 2 | 3 | 4 | 5 | 6) => (s + 1) as 4 | 5)}
                >
                  Continue
                </Button>
              ) : step === 5 ? (
                <Button type="submit" disabled={loading} className="min-w-36">
                  {loading ? "Publishing…" : "Publish Product"}
                </Button>
              ) : (
                /* Step 6 — Save offers and finish */
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/dashboard/products")}
                  >
                    Skip & Finish
                  </Button>
                  <Button
                    type="button"
                    disabled={offerLoading || offers.length === 0}
                    className="min-w-36"
                    onClick={async () => {
                      if (!createdProductId || offers.length === 0) {
                        router.push("/dashboard/products");
                        return;
                      }
                      setOfferLoading(true);
                      try {
                        const token = auth.currentUser?.uid ?? undefined;
                        const validOffers = offers.filter((o) => o.label.trim() && o.description.trim());
                        await Promise.all(
                          validOffers.map((o) =>
                            fetch("/api/sellers/offers", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                              },
                              body: JSON.stringify({
                                title: o.label.trim(),
                                description: o.description.trim(),
                                offerType: o.offerType,
                                discountVal: o.discountVal ? parseFloat(o.discountVal) : null,
                                buyQty: o.buyQty ? parseInt(o.buyQty) : null,
                                getQty: o.getQty ? parseInt(o.getQty) : null,
                                isActive: true,
                                linkedProductId: createdProductId,
                              }),
                            })
                          )
                        );
                        toast.success(`${validOffers.length} offer${validOffers.length > 1 ? "s" : ""} saved!`);
                        router.push("/dashboard/products");
                      } catch {
                        toast.error("Failed to save offers. You can add them later from the Offers dashboard.");
                        router.push("/dashboard/products");
                      } finally {
                        setOfferLoading(false);
                      }
                    }}
                  >
                    {offerLoading ? "Saving…" : `Save ${offers.length > 0 ? offers.length + " " : ""}Offer${offers.length !== 1 ? "s" : ""} & Finish`}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-5">
            {/* Live Preview */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Live Preview</p>
              <PreviewCard
                name={watchedName}
                price={watchedPrice}
                comparePrice={watchedComparePrice}
                images={imageUrls}
                bullets={featureBullets.filter(Boolean)}
                category={selectedCategory.label}
                productType={selectedProductType.label}
              />
            </div>

            {/* Quality Score */}
            <QualityScore score={qualityScore} checks={qualityChecks} />

            {/* Classification */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
              <h2 className="text-xs font-semibold text-gray-700">Classification</h2>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Category</span>
                  <span className="font-medium text-gray-900">{selectedCategory.icon} {selectedCategory.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className="font-medium text-gray-900">{selectedProductType.icon} {selectedProductType.label}</span>
                </div>
              </div>
              <button type="button" onClick={() => setStep(2)} className="text-xs text-blue-600 hover:underline">
                Change →
              </button>
            </div>

            {/* Visibility */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
              <h2 className="text-xs font-semibold text-gray-700">Visibility</h2>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-600 font-normal">Featured</Label>
                <Switch checked={isFeatured} onCheckedChange={(v: boolean) => setValue("isFeatured", v)} />
              </div>
            </div>

            {/* Product Display — manual override for the card's info panel */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
              <div>
                <h2 className="text-xs font-semibold text-gray-700">Product Display</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Type what should show on this product&apos;s card. Use Live preview above to check how it looks. Leave blank to show the name &amp; description automatically.
                </p>
              </div>
              <textarea
                value={cardDisplayText || ""}
                onChange={(e) => setValue("cardDisplayText", e.target.value)}
                maxLength={200}
                rows={3}
                placeholder="e.g. Sathyam Shirts Premium Cotton Casual Shirt — Upgrade your wardrobe with style"
                className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs text-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>

            {/* Variant Summary */}
            {hasVariants && variantRows.length > 0 && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-700">Variant Summary</p>
                {variantRows.map((v: ComboVariantRow) => (
                  <div key={v.id} className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-medium text-gray-800 truncate max-w-[100px]">{v.label}</span>
                    <span>{v.price ? `₹${v.price}` : "Base"} · {v.stock || 0} units</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2 flex items-center justify-between text-xs font-bold text-gray-900">
                  <span>Total stock</span>
                  <span>{variantRows.reduce((s: number, v: ComboVariantRow) => s + parseInt(v.stock || "0"), 0)} units</span>
                </div>
              </div>
            )}

            {/* Steps quick nav */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-1">
              <p className="text-xs font-semibold text-gray-700 mb-2">Sections</p>
              {([3, 4, 5, 6] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => s < 6 && setStep(s)}
                  disabled={s === 6 && !createdProductId}
                  className={`w-full text-left text-xs px-2 py-1.5 rounded-md transition-colors flex items-center gap-2
                    ${step === s ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-50"}
                    ${s === 6 && !createdProductId ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${step === s ? "bg-blue-500" : "bg-gray-300"}`} />
                  {stepTitles[s]}
                  {s === 6 && !createdProductId && <span className="ml-auto text-[10px] text-gray-400">After publish</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
