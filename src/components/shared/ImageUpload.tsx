"use client";

import { useState, useCallback, useRef, useId, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  X,
  ImageIcon,
  CheckCircle2,
  AlertCircle,
  GripVertical,
  Star,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";

interface UploadFile {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  url?: string;
  error?: string;
}

interface ImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
  folder?: string;
  authToken?: string;
  /**
   * Lets the cover tile itself be dragged to preview a crop, independently
   * of the "Photo Position" control in Product Card Design — dragging one
   * never moves the other; each keeps its own position. Only the Photo
   * Position value (see ImagePositionPicker.tsx) is ever saved as
   * `cardImagePosition` and shown on the real storefront card; this one is
   * purely a local, in-widget preview that resets on reload. Off by default
   * so unrelated callers (seller logo/banner uploads, etc.) are unaffected.
   */
  enableCoverPositioning?: boolean;
}

function parseTilePosition(value: string | null | undefined): { x: number; y: number } {
  const fallback = { x: 50, y: 50 };
  if (!value) return fallback;
  const m = value.match(/^(\d{1,3})%\s+(\d{1,3})%$/);
  if (!m) return fallback;
  return {
    x: Math.min(100, Math.max(0, parseInt(m[1], 10))),
    y: Math.min(100, Math.max(0, parseInt(m[2], 10))),
  };
}

// Every caller of <ImageUpload> passes `authToken={auth.currentUser?.uid}` —
// the raw Firebase UID, not a real ID token. The server only ever accepts
// that raw-UID shortcut through a fallback that's explicitly disabled in
// production (see lib/auth.ts), so in a live deployment every upload here
// was 401-ing with "Unauthorized", regardless of which page it was called
// from. `lib/firebase.ts` already patches `window.fetch` to swap a raw UID
// for a real token before it leaves the browser, for exactly this reason —
// but this component posts via XMLHttpRequest (to get upload-progress
// events, which `fetch` doesn't support), so it never went through that
// patch. Repairing it right here, at the one shared upload function, fixes
// every caller at once instead of relying on each of them remembering to
// pass a real token.
async function resolveAuthToken(candidate: string | undefined): Promise<string | undefined> {
  // A real Firebase ID token is a JWT (two dots); a raw UID never contains
  // one, so this only ever touches the broken case.
  if (candidate && !candidate.includes(".")) {
    const user = auth?.currentUser;
    if (user) {
      try {
        return await user.getIdToken();
      } catch {
        // Fall through and use whatever we were given — the request will
        // 401 the same way it did before this fix, no regression.
      }
    }
  }
  return candidate;
}

async function uploadFile(
  file: File,
  folder: string,
  authToken: string | undefined,
  onProgress: (p: number) => void
): Promise<string> {
  const token = await resolveAuthToken(authToken);
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 90));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        onProgress(100);
        resolve(data.url);
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.error || "Upload failed"));
        } catch {
          reject(new Error("Upload failed"));
        }
      }
    };

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
}

function ProgressRing({ progress }: { progress: number }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  return (
    <svg width="40" height="40" className="rotate-[-90deg]">
      <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
      <circle
        cx="20" cy="20" r={r} fill="none"
        stroke="white" strokeWidth="3"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.2s ease" }}
      />
    </svg>
  );
}

function ImageTile({
  item, index, isCover, onRemove, onSetCover, onRetry,
  dragging, onDragStart, onDragEnter, onDragEnd,
  enablePositioning,
}: {
  item: UploadFile; index: number; isCover: boolean;
  onRemove: () => void; onSetCover: () => void; onRetry: () => void;
  dragging: boolean; onDragStart: () => void; onDragEnter: () => void; onDragEnd: () => void;
  /** Only meaningful on the cover tile — see ImageUploadProps.enableCoverPositioning. */
  enablePositioning?: boolean;
}) {
  const tileRef = useRef<HTMLDivElement>(null);
  const [posDragging, setPosDragging] = useState(false);
  // Purely local — never reported to the parent, never saved, never read by
  // anything else. Resets whenever a different photo becomes the cover
  // (this component remounts, since ImageUpload keys tiles by file id, not
  // index) which is the right default for a fresh photo. See
  // ImageUploadProps.enableCoverPositioning for why this is deliberately
  // disconnected from the real "Photo Position" control.
  const [localPos, setLocalPos] = useState("50% 50%");
  // Repositioning and native drag-to-reorder both start from a mousedown/
  // touchstart on this same tile — they can't coexist on one gesture, so
  // only the cover tile (the one photo this actually affects) switches into
  // reposition mode. Every other tile keeps plain reorder-by-drag.
  const canReposition = isCover && item.status === "done" && !!enablePositioning;
  const pos = parseTilePosition(localPos);

  const updateFromPoint = (clientX: number, clientY: number) => {
    const el = tileRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, Math.round(((clientX - rect.left) / rect.width) * 100)));
    const y = Math.min(100, Math.max(0, Math.round(((clientY - rect.top) / rect.height) * 100)));
    setLocalPos(`${x}% ${y}%`);
  };

  return (
    <motion.div
      ref={tileRef}
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      draggable={item.status === "done" && !canReposition}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onPointerDown={canReposition ? (e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        setPosDragging(true);
        updateFromPoint(e.clientX, e.clientY);
      } : undefined}
      onPointerMove={canReposition ? (e) => {
        if (!posDragging) return;
        updateFromPoint(e.clientX, e.clientY);
      } : undefined}
      onPointerUp={canReposition ? () => setPosDragging(false) : undefined}
      onPointerCancel={canReposition ? () => setPosDragging(false) : undefined}
      className={cn(
        "group relative aspect-square overflow-hidden rounded-xl border-2 bg-muted select-none",
        canReposition ? "cursor-crosshair touch-none" : "cursor-grab active:cursor-grabbing",
        isCover ? "border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.2)]" : "border-border/40",
        dragging && "opacity-50 scale-95 border-dashed",
        item.status === "error" && "border-red-400"
      )}
    >
      <img
        src={item.preview}
        alt={`Product image ${index + 1}`}
        className={cn(
          "h-full w-full object-cover transition-transform duration-300",
          !canReposition && "group-hover:scale-105",
          item.status !== "done" && "blur-[1px] brightness-75"
        )}
        style={canReposition ? { objectPosition: `${pos.x}% ${pos.y}%` } : undefined}
        draggable={false}
      />

      {canReposition && (
        <div
          className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-500/90 shadow-md"
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
        />
      )}

      {isCover && item.status === "done" && (
        <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-md bg-blue-500 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
          <Star className="h-2.5 w-2.5 fill-white" /> Cover
        </div>
      )}

      {item.status === "uploading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[2px]">
          <ProgressRing progress={item.progress} />
          <span className="mt-1.5 text-[11px] font-medium text-white">{item.progress}%</span>
        </div>
      )}

      {item.status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/60 backdrop-blur-[2px]">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <span className="px-2 text-center text-[10px] text-red-300">{item.error}</span>
          <button
            type="button" onClick={onRetry}
            className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] text-white hover:bg-white/30 transition-colors"
          >
            <RefreshCw className="h-2.5 w-2.5" /> Retry
          </button>
        </div>
      )}

      <AnimatePresence>
        {item.status === "done" && item.progress === 100 && (
          <motion.div
            initial={{ opacity: 1 }} animate={{ opacity: 0 }}
            transition={{ delay: 0.8, duration: 0.4 }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30"
          >
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {item.status === "done" && (
        <div className="absolute inset-0 flex flex-col items-end justify-between p-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <button
            type="button" onClick={onRemove}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded-full bg-black/60 p-1 text-white backdrop-blur-sm hover:bg-red-500 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
          <div className="flex w-full items-center justify-between gap-1">
            {!isCover && (
              <button
                type="button" onClick={onSetCover}
                className="flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-white backdrop-blur-sm hover:bg-blue-500 transition-colors"
              >
                <Star className="h-2.5 w-2.5" /> Set cover
              </button>
            )}
            <div className="ml-auto rounded-md bg-black/60 p-1 text-white backdrop-blur-sm cursor-grab">
              <GripVertical className="h-3 w-3" />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function ImageUpload({ value, onChange, maxImages = 30, folder = "nexcart/products", authToken, enableCoverPositioning }: ImageUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>(() =>
    value.map((url) => ({
      id: url,
      file: new File([], "existing"),
      preview: url,
      status: "done" as const,
      progress: 100,
      url,
    }))
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // `files` is seeded from `value` once, via the lazy useState initializer
  // above — but on edit pages, `value` starts as [] and only gets the real
  // saved URLs after an async fetch resolves post-mount. Since the lazy
  // initializer never re-runs, that later update was silently dropped and
  // the uploader permanently showed "0 uploaded" with an empty drop zone
  // for products that already had images (while the Live Preview and
  // products list, which read the fetched data directly, showed them fine).
  // Resync once when a non-empty `value` arrives and we haven't already
  // loaded anything locally, without clobbering in-progress/local edits.
  useEffect(() => {
    if (files.length > 0 || value.length === 0) return;
    setFiles(
      value.map((url) => ({
        id: url,
        file: new File([], "existing"),
        preview: url,
        status: "done" as const,
        progress: 100,
        url,
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const canUploadMore = files.filter((f) => f.status !== "error").length < maxImages;

  const syncUrls = useCallback((updated: UploadFile[]) => {
    onChange(updated.filter((f) => f.status === "done" && f.url).map((f) => f.url!));
  }, [onChange]);

  const processFiles = useCallback(async (incoming: File[]) => {
    const currentDone = files.filter((f) => f.status !== "error").length;
    const slots = maxImages - currentDone;
    if (slots <= 0) return;

    const valid = incoming
      .filter((f) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024)
      .slice(0, slots);
    if (!valid.length) return;

    const newItems: UploadFile[] = valid.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
      status: "pending" as const,
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newItems]);

    for (const item of newItems) {
      const { file } = item;
      setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "uploading" as const } : f));

      try {
        const url = await uploadFile(file, folder, authToken, (p) => {
          setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, progress: p } : f));
        });
        setFiles((prev) => {
          const updated = prev.map((f) => f.id === item.id ? { ...f, status: "done" as const, url, progress: 100 } : f);
          syncUrls(updated);
          return updated;
        });
      } catch (err) {
        setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "error" as const, error: err instanceof Error ? err.message : "Upload failed" } : f));
      }
    }
  }, [files, maxImages, folder, authToken, syncUrls]);

  // ── Paste image support ─────────────────────────────────────────────────
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!canUploadMore) return;
      const items = Array.from(e.clipboardData?.items || []);
      const imageFiles = items
        .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
        .map((item) => item.getAsFile())
        .filter((f): f is File => f !== null);
      if (imageFiles.length > 0) {
        e.preventDefault();
        processFiles(imageFiles);
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [canUploadMore, processFiles]);

  const retryUpload = useCallback((id: string) => {
    const item = files.find((f) => f.id === id);
    if (!item) return;
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, status: "uploading" as const, progress: 0, error: undefined } : f));
    uploadFile(item.file, folder, authToken, (p) => {
      setFiles((prev) => prev.map((f) => f.id === id ? { ...f, progress: p } : f));
    })
      .then((url) => {
        setFiles((prev) => {
          const updated = prev.map((f) => f.id === id ? { ...f, status: "done" as const, url, progress: 100 } : f);
          syncUrls(updated);
          return updated;
        });
      })
      .catch((err) => {
        setFiles((prev) => prev.map((f) => f.id === id ? { ...f, status: "error" as const, error: err.message } : f));
      });
  }, [files, folder, authToken, syncUrls]);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      syncUrls(updated);
      return updated;
    });
  }, [syncUrls]);

  const setCover = useCallback((id: string) => {
    setFiles((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx <= 0) return prev;
      const updated = [...prev];
      const [item] = updated.splice(idx, 1);
      updated.unshift(item);
      syncUrls(updated);
      return updated;
    });
  }, [syncUrls]);

  const handleDragEnter = useCallback((targetIdx: number) => {
    if (dragIndex === null || dragIndex === targetIdx) return;
    setFiles((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(targetIdx, 0, moved);
      setDragIndex(targetIdx);
      syncUrls(updated);
      return updated;
    });
  }, [dragIndex, syncUrls]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!canUploadMore) return;
    processFiles(Array.from(e.dataTransfer.files));
  }, [canUploadMore, processFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(Array.from(e.target.files || []));
    e.target.value = "";
  }, [processFiles]);

  const doneCount = files.filter((f) => f.status === "done").length;
  const uploadingCount = files.filter((f) => f.status === "uploading").length;
  const errorCount = files.filter((f) => f.status === "error").length;

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {canUploadMore && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "relative flex cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200 select-none",
              isDragOver
                ? "border-blue-400 bg-blue-50/60 dark:bg-blue-950/30 scale-[1.01] shadow-lg"
                : "border-border/60 bg-muted/20 hover:border-foreground/30 hover:bg-muted/40"
            )}
          >
            <AnimatePresence>
              {isDragOver && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                >
                  <div className="h-24 w-24 rounded-full border-2 border-blue-300 opacity-30 animate-ping" />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              animate={{ y: isDragOver ? -4 : 0 }}
              transition={{ type: "spring", stiffness: 300 }}
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm transition-colors",
                isDragOver ? "bg-blue-500 text-white" : "bg-background text-muted-foreground border border-border/60"
              )}
            >
              {uploadingCount > 0 ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <Upload className="h-6 w-6" />
                </motion.div>
              ) : isDragOver ? (
                <ImageIcon className="h-6 w-6" />
              ) : (
                <Upload className="h-6 w-6" />
              )}
            </motion.div>

            <div className="space-y-1">
              <p className="text-[15px] font-semibold text-foreground">
                {isDragOver ? "Drop images here" : "Drag & drop images"}
              </p>
              <p className="text-sm text-muted-foreground">
                or <span className="font-medium text-blue-500">browse files</span> from your device
              </p>
              <p className="text-xs text-muted-foreground/70 pt-0.5">
                PNG, JPG, WebP · up to 10MB each · {doneCount}/{maxImages} uploaded
              </p>
              <p className="text-xs text-muted-foreground/70">
                💡 You can also <strong>Ctrl+V / ⌘V</strong> to paste an image directly
              </p>
            </div>

            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              className="sr-only"
              onChange={handleFileInput}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(uploadingCount > 0 || errorCount > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium",
              errorCount > 0 && uploadingCount === 0
                ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
                : "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
            )}>
              {uploadingCount > 0 ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                    <Upload className="h-4 w-4" />
                  </motion.div>
                  Uploading {uploadingCount} image{uploadingCount > 1 ? "s" : ""}…
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" />
                  {errorCount} upload{errorCount > 1 ? "s" : ""} failed — click Retry
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {files.map((item, index) => (
                <ImageTile
                  key={item.id} item={item} index={index}
                  isCover={index === 0 && item.status === "done"}
                  onRemove={() => removeFile(item.id)}
                  onSetCover={() => setCover(item.id)}
                  onRetry={() => retryUpload(item.id)}
                  dragging={dragIndex === index}
                  onDragStart={() => setDragIndex(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={() => setDragIndex(null)}
                  enablePositioning={index === 0 ? enableCoverPositioning : undefined}
                />
              ))}
              {canUploadMore && files.length > 0 && (
                <motion.button
                  key="add-more" layout
                  initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }}
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-border/50 bg-muted/20 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-foreground/30 hover:bg-muted/40 hover:text-foreground transition-all"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background border border-border/60">
                    <Upload className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[11px] font-medium">Add more</span>
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {doneCount > 0 && (
        <p className="text-xs text-muted-foreground/70 flex items-center gap-1.5 flex-wrap">
          {doneCount > 1 && (
            <span className="flex items-center gap-1.5">
              <GripVertical className="h-3 w-3" />
              Drag images to reorder · First image is the cover photo
            </span>
          )}
          {enableCoverPositioning && (
            <span className="flex items-center gap-1.5">
              {doneCount > 1 && <span className="text-muted-foreground/40">·</span>}
              Drag <span className="font-medium">inside</span> the cover photo to preview a crop here — use
              Photo Position below to set what actually shows on your storefront card
            </span>
          )}
        </p>
      )}
    </div>
  );
}
