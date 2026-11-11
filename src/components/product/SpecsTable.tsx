"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SpecsTableProps {
  specs: [string, string][];
}

export function SpecsTable({ specs }: SpecsTableProps) {
  const [showAll, setShowAll] = useState(false);
  const LIMIT = 8;
  const hasMore = specs.length > LIMIT;
  const visible = showAll ? specs : specs.slice(0, LIMIT);

  if (specs.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl bg-blue-50 border border-blue-200">

      {/* Header */}
      <div className="px-6 py-4 border-b border-blue-200 bg-blue-100">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-black text-black tracking-tight">Specifications</p>
          <span className="rounded-full px-3 py-1 text-[11px] font-bold bg-blue-200 text-black">
            {specs.length} specs
          </span>
        </div>
      </div>

      {/* Spec rows */}
      <div className="divide-y divide-blue-200">
        <AnimatePresence>
          {visible.map(([key, value], i) => (
            <motion.div
              key={key + i}
              initial={showAll && i >= LIMIT ? { opacity: 0, y: -6 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, delay: i * 0.02 }}
              className="grid grid-cols-[180px_1fr] sm:grid-cols-[220px_1fr] hover:bg-blue-100 transition-colors duration-150"
            >
              <div className="px-6 py-3.5 border-r border-blue-200">
                <span className="text-[12.5px] font-semibold text-black">{key}</span>
              </div>
              <div className="px-6 py-3.5">
                <span className="text-[13px] text-black">{value}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {hasMore && (
        <button
          onClick={() => setShowAll(p => !p)}
          className="flex w-full items-center justify-center gap-2 py-3.5 text-[12px] font-bold text-black hover:bg-blue-100 border-t border-blue-200 transition-colors duration-150"
        >
          {showAll
            ? <><ChevronUp className="h-3.5 w-3.5" /> Show fewer</>
            : <><ChevronDown className="h-3.5 w-3.5" /> Show all {specs.length} specifications</>
          }
        </button>
      )}
    </div>
  );
}
