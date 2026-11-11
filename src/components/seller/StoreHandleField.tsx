"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { useDebounce } from "@/lib/hooks";
import { normalizeHandle, validateHandle } from "@/lib/store-handle";

type Status =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "available" }
  | { kind: "error"; message: string; suggestions?: string[] };

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Reports whether the current value is usable, so the parent can gate submit. */
  onValidityChange?: (valid: boolean) => void;
  /** The seller's existing handle — re-submitting it must not read as "taken". */
  currentHandle?: string | null;
  /** Handles are optional at signup; sellers can claim one later. */
  required?: boolean;
  label?: string;
  helpText?: string;
}

/**
 * Store handle picker with live availability checking.
 *
 * Validates locally first (shape, length, reserved words) and only calls the
 * server once the value could plausibly be free — that keeps the endpoint quiet
 * while someone is still typing, and gives instant feedback on obvious mistakes.
 */
export function StoreHandleField({
  value,
  onChange,
  onValidityChange,
  currentHandle,
  required = false,
  label = "Store Handle",
  helpText,
}: Props) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [origin, setOrigin] = useState("nexcart.com");
  const debounced = useDebounce(value, 400);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") setOrigin(window.location.host);
    } catch {
      /* keep the fallback */
    }
  }, []);

  useEffect(() => {
    const raw = debounced.trim();

    if (!raw) {
      setStatus({ kind: "idle" });
      onValidityChange?.(!required);
      return;
    }

    // Unchanged from what the seller already owns — nothing to check.
    if (currentHandle && normalizeHandle(raw) === currentHandle) {
      setStatus({ kind: "available" });
      onValidityChange?.(true);
      return;
    }

    const local = validateHandle(raw);
    if (!local.ok) {
      setStatus({ kind: "error", message: local.error });
      onValidityChange?.(false);
      return;
    }

    let cancelled = false;
    setStatus({ kind: "checking" });
    onValidityChange?.(false);

    fetch(`/api/sellers/check-handle?handle=${encodeURIComponent(local.handle)}`)
      .then((r) => r.json())
      .then((data: { available: boolean; reason?: string; suggestions?: string[] }) => {
        if (cancelled) return;
        if (data.available) {
          setStatus({ kind: "available" });
          onValidityChange?.(true);
        } else {
          setStatus({
            kind: "error",
            message: data.reason ?? "That handle is not available.",
            suggestions: data.suggestions ?? [],
          });
          onValidityChange?.(false);
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Network failure shouldn't block submission — the server re-checks
        // and the unique constraint is the real guarantee.
        setStatus({ kind: "idle" });
        onValidityChange?.(true);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, currentHandle, required]);

  const preview = normalizeHandle(value) || "your-store";

  return (
    <div className="space-y-1.5">
      <label htmlFor="storeHandle" className="text-[13px] font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div
        className={`flex items-center rounded-[8px] border bg-background transition-colors focus-within:ring-2 focus-within:ring-ring ${
          status.kind === "error" ? "border-red-400 focus-within:ring-red-300" : "border-input"
        }`}
      >
        <span className="shrink-0 pl-3 pr-0.5 text-[13px] text-muted-foreground select-none">
          {origin}/
        </span>
        <input
          id="storeHandle"
          type="text"
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="pickles_02"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => onChange(normalizeHandle(value))}
          className="w-full bg-transparent py-2.5 pr-2 text-[13px] outline-none"
        />
        <span className="shrink-0 pr-3">
          {status.kind === "checking" && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {status.kind === "available" && <Check className="h-4 w-4 text-emerald-600" />}
          {status.kind === "error" && <X className="h-4 w-4 text-red-500" />}
        </span>
      </div>

      {status.kind === "error" ? (
        <div className="space-y-1.5">
          <p className="text-[12px] text-red-500">{status.message}</p>
          {status.suggestions && status.suggestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[12px] text-muted-foreground">Available:</span>
              {status.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChange(s)}
                  className="rounded-full border border-input bg-background px-2.5 py-0.5 text-[12px] text-foreground transition-colors hover:bg-muted"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : status.kind === "available" && value.trim() ? (
        <p className="text-[12px] text-emerald-600">
          {origin}/{preview} is available
        </p>
      ) : (
        <p className="text-[12px] text-muted-foreground">
          {helpText ??
            "This is your shareable store link. Lowercase letters, numbers, dots and underscores."}
        </p>
      )}
    </div>
  );
}
