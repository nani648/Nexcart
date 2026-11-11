"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import Link from "next/link";
import {
  Home, Download, Share2, Printer, Copy, QrCode,
  Check, MessageCircle, ExternalLink, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function getUid() {
  return auth.currentUser?.uid ?? (() => { try { return localStorage.getItem("nxc-uid"); } catch { return null; } })();
}

export default function QRCodePage() {
  const [storeName, setStoreName] = useState("");
  const [storeUrl, setStoreUrl]   = useState("");
  const [qrSrc, setQrSrc]         = useState("");
  const [loading, setLoading]     = useState(true);
  const [copied, setCopied]       = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const uid = getUid();
    fetch("/api/sellers/profile", { headers: uid ? { Authorization: `Bearer ${uid}` } : {} })
      .then(r => r.json())
      .then(data => {
        const id     = data.seller?.sellerId ?? "";
        const handle = data.seller?.storeHandle ?? "";
        const name   = data.seller?.storeName ?? "My Store";
        // Prefer the vanity handle so newly printed codes carry the short,
        // memorable URL. Codes already printed against /store/<sellerId> keep
        // working — that route permanently redirects to the handle.
        const url = handle
          ? `${window.location.origin}/${handle}`
          : `${window.location.origin}/store/${id}`;
        setStoreName(name);
        setStoreUrl(url);
        setQrSrc(
          `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}&color=000000&bgcolor=ffffff&margin=2&format=png`
        );
      })
      .catch(() => toast.error("Failed to load store info"))
      .finally(() => setLoading(false));
  }, []);

  const downloadQR = async () => {
    if (!qrSrc) return;
    setDownloading(true);
    try {
      const res  = await fetch(qrSrc);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${storeName.replace(/\s+/g, "-")}-QR-Code.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("QR Code downloaded!");
    } catch {
      toast.error("Download failed — try again");
    } finally {
      setDownloading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(storeUrl)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); toast.success("Store link copied!"); })
      .catch(() => toast.error("Could not copy"));
  };

  const shareWhatsApp = () => {
    const text = `🛒 Visit *${storeName}* on NexCart!\n\nScan the QR or click the link below to shop now 👇\n${storeUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareNative = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: storeName, text: `Visit ${storeName} on NexCart`, url: storeUrl }); }
      catch { /* cancelled */ }
    } else {
      copyLink();
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Link href="/" className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors">
              <Home className="h-3.5 w-3.5" /><span>Home</span>
            </Link>
            <span className="text-muted-foreground/50 text-[12px]">/</span>
            <span className="text-[12px] text-foreground font-medium">QR Code</span>
          </div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <QrCode className="h-5 w-5" /> Store QR Code
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Download, print, and share your store QR code anywhere
          </p>
        </div>
      </div>

      <div className="max-w-xl space-y-5">

        {/* QR Card */}
        <div className="rounded-xl border border-border/50 p-6 flex flex-col items-center gap-4" id="qr-print-area">
          {loading ? (
            <div className="w-[200px] h-[200px] flex items-center justify-center rounded-2xl bg-muted/40">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : qrSrc ? (
            <div className="rounded-2xl border-2 border-border/60 bg-white p-5 shadow-md inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} alt="Store QR Code" width={200} height={200} className="block rounded-lg" />
              <div className="mt-3 text-center">
                <p className="font-bold text-[15px] text-gray-900">{storeName}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Scan to visit store · NexCart</p>
              </div>
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            This QR code opens your store directly — customers just point their camera at it
          </p>
        </div>

        {/* Store URL row */}
        <div className="rounded-xl border border-border/50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Your Store Link</p>
          <div className="flex items-center gap-2">
            <p className="flex-1 min-w-0 text-[13px] font-medium text-foreground truncate rounded-lg bg-muted/40 border border-border/50 px-3 py-2">
              {storeUrl || "Loading…"}
            </p>
            <button
              onClick={copyLink}
              className="shrink-0 flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[12px] font-medium hover:bg-muted transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <a
              href={storeUrl}
              target="_blank"
              className="shrink-0 flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[12px] font-medium hover:bg-muted transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open
            </a>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={downloadQR} disabled={!qrSrc || downloading} className="h-12 gap-2">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {downloading ? "Downloading…" : "Download PNG"}
          </Button>

          <Button
            onClick={shareWhatsApp}
            disabled={!storeUrl}
            variant="outline"
            className="h-12 gap-2 border-green-500/40 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/20"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </Button>

          <Button onClick={shareNative} disabled={!storeUrl} variant="outline" className="h-12 gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>

          <Button onClick={() => window.print()} disabled={!qrSrc} variant="outline" className="h-12 gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>

        {/* Tips */}
        <div className="rounded-xl border border-border/50 p-5 space-y-3 bg-muted/20">
          <h3 className="font-semibold text-[14px]">How to use your QR Code</h3>
          <ul className="space-y-2.5 text-[13px] text-muted-foreground">
            {[
              "Download as PNG and print — stick it at your shop counter, on product bags, or in your window display",
              "Tap WhatsApp to instantly share your store link to groups or contacts",
              "Use Print to get a clean printout with your store name ready to laminate",
              "Customers just scan with their phone camera — no app needed — and land on your store",
            ].map((tip, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold mt-0.5">
                  {i + 1}
                </span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>

      {/* Print styles — only QR card visible when printing */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #qr-print-area { display: flex !important; position: fixed; inset: 0; align-items: center; justify-content: center; }
          #qr-print-area * { visibility: visible !important; }
        }
      `}</style>
    </div>
  );
}
