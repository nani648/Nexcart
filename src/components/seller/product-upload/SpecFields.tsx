"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SpecField } from "@/lib/category-config";

interface SpecFieldsProps {
  fields: SpecField[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function SpecFields({ fields, values, onChange }: SpecFieldsProps) {
  if (fields.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="font-medium text-gray-900 mb-4">Product Specifications</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-xs text-gray-600 font-medium">
              {field.label}
              {field.required && (
                <span className="text-red-500 ml-0.5">*</span>
              )}
            </Label>

            {field.type === "select" && field.options ? (
              <Select
                value={values[field.key] || ""}
                onValueChange={(v) => onChange(field.key, v)}
              >
                <SelectTrigger className="h-9 text-sm border-gray-200">
                  <SelectValue placeholder={`Select ${field.label}`} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((opt) => (
                    <SelectItem key={opt} value={opt} className="text-sm">
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={field.type === "number" ? "number" : "text"}
                value={values[field.key] || ""}
                onChange={(e) => onChange(field.key, e.target.value)}
                placeholder={field.placeholder || `Enter ${field.label}`}
                className="h-9 text-sm border-gray-200"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
