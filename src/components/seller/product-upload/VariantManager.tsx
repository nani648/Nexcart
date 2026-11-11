"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Trash2, Sparkles, X, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ComboVariantRow {
  id: string;
  combo: Record<string, string>;
  label: string;
  price: string;
  comparePrice: string;
  stock: string;
}

export interface VariantRow {
  id: string;
  value: string;
  price: string;
  stock: string;
}

interface SpecField {
  key: string;
  label: string;
}

interface VariantManagerProps {
  variantTypes: string[];
  rows: ComboVariantRow[];
  onRowsChange: (rows: ComboVariantRow[]) => void;
  specValues?: Record<string, string>;
  specFields?: SpecField[];
  basePrice?: string;
  baseComparePrice?: string;
  baseStock?: string;
  groupName?: string;
  onGroupNameChange?: (name: string) => void;
  categoryId?: string;
  productTypeId?: string;
}

// ─── Smart Presets by Product Type ───────────────────────────────────────────

interface DimensionPreset {
  name: string;
  values: string;
}

const PRESETS: Record<string, DimensionPreset[]> = {
  mobile: [
    { name: "Storage", values: "64GB, 128GB, 256GB" },
    { name: "RAM", values: "4GB, 6GB, 8GB, 12GB" },
    { name: "Color", values: "Black, White, Blue, Gold, Silver" },
  ],
  laptop: [
    { name: "Storage", values: "256GB, 512GB, 1TB" },
    { name: "RAM", values: "8GB, 16GB, 32GB" },
    { name: "Processor", values: "i5, i7, i9" },
    { name: "Color", values: "Silver, Space Gray" },
  ],
  tablet: [
    { name: "Storage", values: "64GB, 128GB, 256GB" },
    { name: "Color", values: "Silver, Gray, Gold" },
  ],
  smartwatch: [
    { name: "Color", values: "Black, Silver, Rose Gold" },
    { name: "Size", values: "41mm, 45mm" },
  ],
  tv: [
    { name: "Size", values: '32", 43", 55", 65"' },
  ],
  headphones: [
    { name: "Color", values: "Black, White, Red" },
  ],
  camera: [
    { name: "Color", values: "Black, Silver" },
  ],
  monitor: [
    { name: "Size", values: '24", 27", 32"' },
  ],
  speaker: [
    { name: "Color", values: "Black, White, Blue" },
  ],
  tshirt: [
    { name: "Size", values: "XS, S, M, L, XL, XXL" },
    { name: "Color", values: "Black, White, Blue, Red, Green, Yellow, Navy" },
    { name: "Material", values: "Cotton, Polyester, Blend" },
    { name: "Fit", values: "Slim, Regular, Loose" },
  ],
  shirt: [
    { name: "Size", values: "S, M, L, XL, XXL" },
    { name: "Color", values: "White, Blue, Black, Grey" },
    { name: "Fit", values: "Slim, Regular" },
  ],
  jeans: [
    { name: "Size", values: "28, 30, 32, 34, 36, 38" },
    { name: "Length", values: "Short, Regular, Long" },
    { name: "Color", values: "Black, Blue, Grey, Brown" },
    { name: "Fit", values: "Skinny, Slim, Regular, Relaxed" },
  ],
  shoes: [
    { name: "Size", values: "6, 7, 8, 9, 10, 11" },
    { name: "Color", values: "Black, Brown, White, Red, Navy" },
    { name: "Width", values: "Narrow, Normal, Wide" },
  ],
  saree: [
    { name: "Color", values: "Red, Blue, Green, Yellow, Pink" },
  ],
  hoodie: [
    { name: "Size", values: "XS, S, M, L, XL, XXL" },
    { name: "Color", values: "Black, Grey, White, Navy" },
  ],
  watches: [
    { name: "Color", values: "Black, Silver, Gold, Rose Gold" },
  ],
  bags: [
    { name: "Size", values: "Small, Medium, Large" },
    { name: "Color", values: "Black, Brown, Blue, Red, Grey" },
    { name: "Material", values: "Canvas, Leather, Nylon, Polyester" },
  ],
  grains: [
    { name: "Weight", values: "500g, 1kg, 2kg, 5kg" },
  ],
  spices: [
    { name: "Weight", values: "50g, 100g, 200g, 500g" },
  ],
  pickles: [
    { name: "Size", values: "100g, 200g, 500g, 1kg" },
    { name: "Flavor", values: "Spicy, Mild, Sweet, Tangy" },
  ],
  sofa: [
    { name: "Size", values: "2-Seater, 3-Seater, Sectional" },
    { name: "Color", values: "Black, Grey, Brown, Blue, Beige" },
    { name: "Fabric", values: "Cotton, Leather, Suede, Microfiber" },
  ],
  bed: [
    { name: "Size", values: "Single, Double, Queen, King" },
    { name: "Color", values: "Walnut, White, Oak, Black" },
  ],
  skincare: [
    { name: "Size", values: "15ml, 30ml, 50ml, 100ml" },
  ],
  makeup: [
    { name: "Shade", values: "Fair, Light, Medium, Tan, Deep" },
    { name: "Size", values: "15ml, 30ml, 50ml" },
    { name: "Coverage", values: "Light, Medium, Full" },
  ],
  refrigerator: [
    { name: "Color", values: "Silver, Black, White" },
  ],
  washingmachine: [],
  fiction: [],
  textbook: [],
  cricket: [
    { name: "Size", values: "Junior, Youth, Senior" },
  ],
  fitness: [
    { name: "Weight", values: "2kg, 5kg, 10kg, 15kg, 20kg" },
    { name: "Size", values: "S, M, L" },
  ],
  phonecase: [
    { name: "Color", values: "Black, Clear, Blue, Red, Pink" },
    { name: "Model", values: "iPhone 15, Samsung S24, Pixel 8" },
  ],
  charger: [],
};

const AXIS_DEFAULT_VALUES: Record<string, string> = {
  Storage: "64GB, 128GB, 256GB",
  Color: "Black, White, Blue",
  RAM: "4GB, 8GB, 16GB",
  Size: "S, M, L, XL",
  Weight: "500g, 1kg, 2kg",
  Pack: "Single, 3-Pack, 6-Pack",
  "Graphics Card": "RTX 4060, RTX 4070",
  SSD: "256GB, 512GB, 1TB",
  Processor: "i5, i7, i9",
  Shade: "Fair, Light, Medium, Tan, Deep",
  Flavor: "Original, Spicy, BBQ",
  Fabric: "Cotton, Polyester, Blend",
  Fit: "Slim, Regular, Loose",
  Length: "Short, Regular, Long",
  Width: "Narrow, Normal, Wide",
  Coverage: "Light, Medium, Full",
  Model: "Model A, Model B, Model C",
  Material: "Leather, Canvas, Nylon",
};

const AXIS_PLACEHOLDERS: Record<string, string> = {
  Storage: "e.g. 128GB, 256GB, 512GB",
  Color: "e.g. Black, White, Blue",
  RAM: "e.g. 4GB, 8GB, 16GB",
  Size: "e.g. S, M, L, XL",
  Weight: "e.g. 500g, 1kg, 2kg",
  Pack: "e.g. 1 Pack, 3 Pack",
  "Graphics Card": "e.g. RTX 4060, RTX 4070",
  SSD: "e.g. 256GB, 512GB, 1TB",
  Processor: "e.g. i5, i7, i9",
};

const ALL_AXES = [
  "Size", "Color", "Storage", "RAM", "Processor", "Material",
  "Fit", "Length", "Width", "Weight", "Pack", "Shade", "Flavor",
  "Fabric", "Coverage", "Model", "Graphics Card", "SSD",
];

// ─── Utilities ────────────────────────────────────────────────────────────────

function makeComboRow(
  combo: Record<string, string>,
  price = "",
  comparePrice = "",
  stock = "0"
): ComboVariantRow {
  const label = Object.entries(combo)
    .map(([k, v]) => `${v} ${k}`)
    .join(" / ");
  return { id: crypto.randomUUID(), combo, label, price, comparePrice, stock };
}

function cartesian(arrays: string[][]): string[][] {
  return arrays.reduce<string[][]>(
    (acc, cur) => acc.flatMap((a) => cur.map((b) => [...a, b])),
    [[]]
  );
}

function generateAllCombinations(
  axes: { name: string; rawValues: string }[],
  baseStock: string = "0"
): ComboVariantRow[] {
  const validAxes = axes
    .map((a) => ({
      name: a.name,
      values: a.rawValues.split(",").map((v) => v.trim()).filter(Boolean),
    }))
    .filter((a) => a.values.length > 0);
  if (validAxes.length === 0) return [];
  return cartesian(validAxes.map((a) => a.values)).map((vals) => {
    const combo: Record<string, string> = {};
    validAxes.forEach((a, i) => { combo[a.name] = vals[i]; });
    return makeComboRow(combo, "", "", baseStock);
  });
}

// ─── ValueTag ─────────────────────────────────────────────────────────────────

function ValueTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-900 text-white text-[11px] font-medium">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="hover:text-red-300 transition-colors"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

// ─── AxisRow ──────────────────────────────────────────────────────────────────

function AxisRow({
  name,
  rawValues,
  onValuesChange,
  onRemove,
}: {
  name: string;
  rawValues: string;
  onValuesChange: (v: string) => void;
  onRemove: () => void;
}) {
  const [inputVal, setInputVal] = useState("");
  const tags = rawValues.split(",").map((v) => v.trim()).filter(Boolean);

  const addTag = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    onValuesChange([...tags, trimmed].join(", "));
    setInputVal("");
  };

  const removeTag = (tag: string) => {
    onValuesChange(tags.filter((t) => t !== tag).join(", "));
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-800 uppercase tracking-wide">
          {name}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="h-5 w-5 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 min-h-[24px]">
        {tags.map((tag) => (
          <ValueTag key={tag} label={tag} onRemove={() => removeTag(tag)} />
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-1.5">
        <Input
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag(inputVal);
            }
          }}
          placeholder={AXIS_PLACEHOLDERS[name] || "Type a value & press Enter"}
          className="h-7 text-xs border-gray-200 bg-gray-50 flex-1"
        />
        {inputVal.trim() && (
          <button
            type="button"
            onClick={() => addTag(inputVal)}
            className="h-7 px-2 rounded-md bg-gray-900 text-white text-xs hover:bg-gray-700 transition-colors flex-shrink-0"
          >
            Add
          </button>
        )}
      </div>

      {/* Quick fill */}
      {AXIS_DEFAULT_VALUES[name] && tags.length === 0 && (
        <button
          type="button"
          onClick={() => onValuesChange(AXIS_DEFAULT_VALUES[name])}
          className="text-[10px] text-blue-600 hover:text-blue-800 transition-colors"
        >
          ✦ Quick fill: {AXIS_DEFAULT_VALUES[name]}
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VariantManager({
  variantTypes,
  rows,
  onRowsChange,
  specValues = {},
  specFields = [],
  basePrice = "",
  baseComparePrice = "",
  baseStock = "0",
  categoryId,
  productTypeId,
}: VariantManagerProps) {
  const presetKey = productTypeId ?? "";
  const smartPresets: DimensionPreset[] = PRESETS[presetKey] ?? [];

  const buildInitialAxes = () => {
    if (smartPresets.length > 0) {
      return smartPresets.map((p) => ({ name: p.name, rawValues: p.values }));
    }
    return variantTypes.slice(0, 4).map((name) => ({
      name,
      rawValues: AXIS_DEFAULT_VALUES[name] ?? "",
    }));
  };

  const [axes, setAxes] = useState<{ name: string; rawValues: string }[]>(buildInitialAxes);
  const [customAxis, setCustomAxis] = useState("");
  const [showAllAxes, setShowAllAxes] = useState(false);
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");
  const [generated, setGenerated] = useState(false);

  const prevTypeRef = useRef(productTypeId);
  useEffect(() => {
    if (prevTypeRef.current !== productTypeId) {
      prevTypeRef.current = productTypeId;
      setAxes(buildInitialAxes());
      onRowsChange([]);
      setGenerated(false);
    }
  }, [productTypeId]);

  // Build a set of spec values to identify the "pre-configured" variant row
  const buildSpecValueSet = () =>
    new Set(
      Object.values(specValues)
        .map((v) => String(v).trim().toLowerCase())
        .filter(Boolean)
    );

  const isSpecMatchedRow = (r: ComboVariantRow, specValueSet: Set<string>) =>
    specValueSet.size > 0 &&
    Object.values(r.combo).length > 0 &&
    Object.values(r.combo).every((v) => specValueSet.has(v.toLowerCase()));

  // Auto-fill ONLY the spec-matched row when base price changes
  const prevBasePriceRef = useRef("");
  useEffect(() => {
    const prev = prevBasePriceRef.current;
    prevBasePriceRef.current = basePrice;
    if (!basePrice || basePrice === prev || rows.length === 0) return;
    const specValueSet = buildSpecValueSet();
    onRowsChange(
      rows.map((r) =>
        isSpecMatchedRow(r, specValueSet) && (!r.price || r.price === "0" || r.price === "")
          ? { ...r, price: basePrice, comparePrice: baseComparePrice || r.comparePrice }
          : r
      )
    );
  }, [basePrice]);

  // Auto-fill ONLY the spec-matched row when base stock changes
  const prevBaseStockRef = useRef("");
  useEffect(() => {
    const prev = prevBaseStockRef.current;
    prevBaseStockRef.current = baseStock;
    if (!baseStock || baseStock === "0" || baseStock === prev || rows.length === 0) return;
    const specValueSet = buildSpecValueSet();
    onRowsChange(
      rows.map((r) =>
        isSpecMatchedRow(r, specValueSet) && (!r.stock || r.stock === "0" || r.stock === "")
          ? { ...r, stock: baseStock }
          : r
      )
    );
  }, [baseStock]);

  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || rows.length > 0 || Object.keys(specValues).length === 0) return;
    seededRef.current = true;
    const combo: Record<string, string> = {};
    variantTypes.forEach((axis) => {
      const field = specFields.find(
        (f) =>
          f.label.toLowerCase() === axis.toLowerCase() ||
          f.key.toLowerCase() === axis.toLowerCase()
      );
      const val = field ? (specValues[field.key] || "").trim() : "";
      if (val) combo[axis] = val;
    });
    if (Object.keys(combo).length > 0) {
      const label = Object.entries(combo).map(([k, v]) => `${v} ${k}`).join(" / ");
      onRowsChange([
        {
          id: crypto.randomUUID(),
          combo,
          label,
          price: basePrice,
          comparePrice: baseComparePrice,
          stock: baseStock,
        },
      ]);
    }
  }, []);

  const addAxis = (name: string) => {
    if (axes.find((a) => a.name === name)) return;
    setAxes((prev) => [...prev, { name, rawValues: AXIS_DEFAULT_VALUES[name] ?? "" }]);
  };
  const removeAxis = (name: string) =>
    setAxes((prev) => prev.filter((a) => a.name !== name));
  const updateAxisValues = (name: string, rawValues: string) =>
    setAxes((prev) => prev.map((a) => (a.name === name ? { ...a, rawValues } : a)));
  const addCustomAxis = () => {
    const trimmed = customAxis.trim();
    if (!trimmed || axes.find((a) => a.name === trimmed)) return;
    setAxes((prev) => [...prev, { name: trimmed, rawValues: "" }]);
    setCustomAxis("");
  };

  const handleGenerateAll = () => {
    const allCombos = generateAllCombinations(axes, "");
    if (allCombos.length === 0) return;
    const specValueSet = buildSpecValueSet();
    onRowsChange(
      allCombos.map((c) => {
        const matched = isSpecMatchedRow(c, specValueSet);
        return {
          ...c,
          price: matched ? basePrice : "",
          comparePrice: matched ? baseComparePrice : "",
          stock: matched ? baseStock : "",
        };
      })
    );
    setGenerated(true);
  };

  const applyBulkPrice = () => {
    if (!bulkPrice) return;
    onRowsChange(rows.map((r) => ({ ...r, price: bulkPrice })));
  };
  const applyBulkStock = () => {
    if (!bulkStock) return;
    onRowsChange(rows.map((r) => ({ ...r, stock: bulkStock })));
  };

  const updateRow = (
    id: string,
    field: "price" | "comparePrice" | "stock",
    val: string
  ) => onRowsChange(rows.map((r) => (r.id === id ? { ...r, [field]: val } : r)));

  const removeRow = (id: string) => onRowsChange(rows.filter((r) => r.id !== id));

  const totalStock = rows.reduce((s, r) => s + parseInt(r.stock || "0", 10), 0);
  const canGenerate = axes.some((a) => a.rawValues.split(",").some((v) => v.trim()));
  const realCount = axes
    .map((a) => a.rawValues.split(",").filter((v) => v.trim()).length)
    .filter((n) => n > 0)
    .reduce((a, b) => a * b, 1);

  const unusedAxes = ALL_AXES.filter((ax) => !axes.find((a) => a.name === ax));

  return (
    <div className="space-y-5">

      {/* Step 1 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold text-gray-700 uppercase tracking-widest">
            Step 1 — Configure dimensions
          </Label>
          {smartPresets.length > 0 && (
            <span className="text-[10px] bg-green-50 border border-green-200 text-green-700 px-2 py-0.5 rounded-full font-medium">
              ✦ Smart presets loaded
            </span>
          )}
        </div>

        <div className="space-y-2">
          {axes.map((axis) => (
            <AxisRow
              key={axis.name}
              name={axis.name}
              rawValues={axis.rawValues}
              onValuesChange={(v) => updateAxisValues(axis.name, v)}
              onRemove={() => removeAxis(axis.name)}
            />
          ))}
        </div>

        {/* Add more */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowAllAxes((v) => !v)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
          >
            {showAllAxes ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            {showAllAxes ? "Hide" : "Add more dimensions"}
          </button>

          {showAllAxes && (
            <div className="rounded-xl border border-dashed border-gray-200 p-3 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {unusedAxes.map((ax) => (
                  <button
                    key={ax}
                    type="button"
                    onClick={() => addAxis(ax)}
                    className="px-2.5 py-1 rounded-full border border-gray-200 text-xs text-gray-600 hover:border-gray-900 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                  >
                    + {ax}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5 pt-1 border-t border-gray-100">
                <Input
                  value={customAxis}
                  onChange={(e) => setCustomAxis(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addCustomAxis())
                  }
                  placeholder="Custom dimension name…"
                  className="h-7 text-xs border-gray-200 bg-gray-50 flex-1"
                />
                {customAxis.trim() && (
                  <button
                    type="button"
                    onClick={addCustomAxis}
                    className="h-7 px-2 rounded-md bg-gray-900 text-white text-xs hover:bg-gray-700 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Generate button */}
      {axes.length > 0 && (
        <div className="space-y-2">
          {canGenerate && realCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
              <Sparkles className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                This will create{" "}
                <span className="font-bold">{realCount} combinations</span>
                {realCount > 100 && (
                  <span className="text-blue-500">
                    {" "}— a lot! Use bulk edit after generating.
                  </span>
                )}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerateAll}
            disabled={!canGenerate || realCount > 1000}
            title={realCount > 1000 ? "Maximum 1000 combinations" : ""}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4" />
            {generated && rows.length > 0
              ? `Regenerate All (${realCount} combinations)`
              : `Generate All${realCount > 0 ? ` (${realCount})` : ""} Combinations`}
          </button>

          {generated && rows.length > 0 && (
            <p className="text-[11px] text-center text-amber-600">
              ⚠ Regenerating will replace all existing rows and prices
            </p>
          )}
        </div>
      )}

      {/* Step 2 */}
      {rows.length > 0 && (
        <div className="space-y-3">
          <Label className="text-xs font-bold text-gray-700 uppercase tracking-widest">
            Step 2 — Set price &amp; stock
          </Label>

          {/* Bulk edit */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              Bulk edit all rows
            </p>
            <div className="flex gap-2">
              <div className="flex gap-1.5 flex-1">
                <Input
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(e.target.value)}
                  type="number"
                  placeholder="₹ Set all prices"
                  className="h-8 text-xs border-gray-200 bg-white flex-1"
                />
                <button
                  type="button"
                  onClick={applyBulkPrice}
                  disabled={!bulkPrice}
                  className="h-8 px-3 text-xs font-medium rounded-lg bg-gray-900 text-white disabled:opacity-40 hover:bg-gray-700 transition-colors flex-shrink-0"
                >
                  Apply
                </button>
              </div>
              <div className="flex gap-1.5 flex-1">
                <Input
                  value={bulkStock}
                  onChange={(e) => setBulkStock(e.target.value)}
                  type="number"
                  placeholder="Set all stock"
                  className="h-8 text-xs border-gray-200 bg-white flex-1"
                />
                <button
                  type="button"
                  onClick={applyBulkStock}
                  disabled={!bulkStock}
                  className="h-8 px-3 text-xs font-medium rounded-lg bg-gray-900 text-white disabled:opacity-40 hover:bg-gray-700 transition-colors flex-shrink-0"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-[1fr_90px_100px_72px_28px] gap-2 bg-gray-50 px-3 py-2 text-[11px] font-semibold text-gray-500 border-b border-gray-100">
              <span>Combination</span>
              <span>Price (₹)</span>
              <span>MRP (₹)</span>
              <span>Stock</span>
              <span />
            </div>

            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {rows.map((row, i) => (
                <div
                  key={row.id}
                  className={`grid grid-cols-[1fr_90px_100px_72px_28px] gap-2 items-center px-3 py-2 ${
                    i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                  }`}
                >
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(row.combo).map(([axis, val]) => (
                      <span
                        key={axis}
                        className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-700"
                      >
                        <span className="text-gray-400 mr-0.5">{axis[0]}:</span>
                        {val}
                      </span>
                    ))}
                  </div>

                  <Input
                    value={row.price}
                    onChange={(e) => updateRow(row.id, "price", e.target.value)}
                    type="number"
                    step="0.01"
                    placeholder="0"
                    className="h-7 text-xs border-gray-200 bg-white px-2"
                  />

                  <Input
                    value={row.comparePrice}
                    onChange={(e) => updateRow(row.id, "comparePrice", e.target.value)}
                    type="number"
                    step="0.01"
                    placeholder="0"
                    className="h-7 text-xs border-gray-200 bg-white px-2"
                  />

                  <input
                    value={row.stock}
                    onChange={(e) =>
                      updateRow(row.id, "stock", e.target.value.replace(/[^0-9]/g, ""))
                    }
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    className="h-7 w-full rounded-md border border-gray-200 bg-white px-2 text-xs text-center focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />

                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    className="h-6 w-6 flex items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between rounded-xl bg-gray-900 text-white px-4 py-2.5 text-xs">
            <span className="font-medium">
              {rows.length} variant{rows.length !== 1 ? "s" : ""} generated
            </span>
            <span className="text-gray-300">
              Total stock:{" "}
              <span className="font-bold text-white">{totalStock} units</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
