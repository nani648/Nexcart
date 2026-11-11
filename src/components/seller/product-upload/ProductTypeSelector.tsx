"use client";

import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CategoryConfig, ProductType } from "@/lib/category-config";
import { GENERIC_PRODUCT_TYPE } from "@/lib/category-config";

interface ProductTypeSelectorProps {
  category: CategoryConfig;
  onSelect: (pt: ProductType) => void;
  onBack: () => void;
}

export function ProductTypeSelector({
  category,
  onSelect,
  onBack,
}: ProductTypeSelectorProps) {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Categories
        </button>

        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">{category.icon}</span>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            {category.label}
          </h1>
        </div>
        <p className="text-sm text-gray-500">
          Step 2 of 3 — Select the product type
        </p>
      </div>

      {/* Product Types Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {category.productTypes.map((pt) => (
          <button
            key={pt.id}
            onClick={() => onSelect(pt)}
            className="group flex flex-col items-start p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-900 hover:shadow-sm transition-all duration-150 text-left"
          >
            <span className="text-2xl mb-3">{pt.icon}</span>
            <p className="text-sm font-medium text-gray-900">{pt.label}</p>
            <p className="text-xs text-gray-400 mt-1">
              {pt.specFields.length} spec fields
              {pt.variantTypes.length > 0
                ? ` · ${pt.variantTypes.join(", ")} variants`
                : ""}
            </p>
          </button>
        ))}

        {/* Other / Not listed — skips pre-set spec fields, goes straight to Step 3 with free-form specs */}
        <button
          onClick={() => onSelect(GENERIC_PRODUCT_TYPE)}
          className="group flex flex-col items-start p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 hover:border-gray-900 hover:shadow-sm transition-all duration-150 text-left"
        >
          <span className="text-2xl mb-3">📦</span>
          <p className="text-sm font-medium text-gray-900">Other / Not listed</p>
          <p className="text-xs text-gray-400 mt-1">
            Free-form specs · add them yourself
          </p>
        </button>
      </div>
    </div>
  );
}
