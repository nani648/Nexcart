"use client";

import { X } from "lucide-react";

interface FilterChip {
  key: string;
  label: string;
  value: string;
}

interface FilterChipsProps {
  filters: FilterChip[];
  onRemove: (key: string, value: string) => void;
  onClearAll: () => void;
}

export function FilterChips({ filters, onRemove, onClearAll }: FilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-white dark:bg-card border-b border-border/50">
      <span className="text-[12px] font-semibold text-muted-foreground shrink-0">Filters:</span>

      <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
        {filters.map((chip) => (
          <span
            key={`${chip.key}-${chip.value}`}
            className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-full px-3 py-1 text-[12px] font-medium"
          >
            {chip.label}
            <button
              onClick={() => onRemove(chip.key, chip.value)}
              aria-label={`Remove ${chip.label} filter`}
              className="ml-0.5 rounded-full hover:bg-primary/20 transition-colors p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      <button
        onClick={onClearAll}
        className="text-red-500 text-[12px] font-semibold shrink-0 hover:text-red-600 transition-colors"
      >
        Clear All
      </button>
    </div>
  );
}
