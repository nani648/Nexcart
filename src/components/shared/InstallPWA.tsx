"use client";

import { useEffect, useState, useRef } from "react";
import { X, Download } from "lucide-react";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Phase = "prompt" | "installing" | "done";

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<Phase>("prompt");
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (sessionStorage.getItem("pwa-install-dismissed")) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    const onInstalled = () => {
      // Jump to 100% and mark done
      if (timerRef.current) clearInterval(timerRef.current);
      setProgress(100);
      setTimeout(() => {
        setPhase("done");
        // After a brief moment, try to relaunch via the installed PWA URL.
        // Chrome on Android intercepts navigation to a PWA-scope URL and opens
        // the installed standalone app instead of staying in the browser tab.
        setTimeout(() => {
          try {
            // Navigate to the root URL — Chrome may route this into the PWA window
            window.location.replace(window.location.origin + "/");
          } catch {
            try { window.close(); } catch {}
          }
        }, 2000);
      }, 400);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setPhase("installing");
      setProgress(0);

      // Animate progress from 0 → 85% while waiting for appinstalled
      timerRef.current = setInterval(() => {
        setProgress((p) => {
          if (p >= 85) {
            clearInterval(timerRef.current!);
            return 85;
          }
          return p + Math.random() * 8 + 3;
        });
      }, 300);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem("pwa-install-dismissed", "1");
  };

  const handleOpenApp = () => {
    sessionStorage.setItem("pwa-install-dismissed", "1");
    // Navigate to the PWA scope URL — Chrome on Android may intercept this
    // and open the installed standalone app instead of staying in the tab
    try {
      window.location.replace(window.location.origin + "/");
    } catch {
      setShow(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-0 right-0 z-50 flex justify-center px-4 animate-in slide-in-from-bottom-4 duration-300">
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
          border: "1.5px solid rgba(255,255,255,0.15)",
        }}
      >
        {/* Top shimmer line */}
        <div className="h-[1.5px] w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)" }} />

        <div className="flex items-center gap-3 px-4 py-3.5">
          {/* App icon */}
          <div className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden shadow-lg">
            <Image src="/icon-512.png" alt="NexCart" width={48} height={48} className="w-full h-full object-cover" />
          </div>

          {/* Content area */}
          <div className="flex-1 min-w-0">
            {phase === "prompt" && (
              <>
                <p className="text-[13px] font-bold text-white leading-tight">Add NexCart to your home screen</p>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.60)" }}>Fast, offline-ready shopping</p>
              </>
            )}

            {phase === "installing" && (
              <>
                <p className="text-[13px] font-bold text-white leading-tight">Installing NexCart…</p>
                {/* Progress bar */}
                <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(progress, 100)}%`,
                      background: "linear-gradient(90deg, #6366f1, #06b6d4)",
                    }}
                  />
                </div>
                <p className="text-[11px] mt-1 font-semibold" style={{ color: "rgba(255,255,255,0.65)" }}>
                  {Math.round(Math.min(progress, 100))}% complete
                </p>
              </>
            )}

            {phase === "done" && (
              <>
                <p className="text-[13px] font-bold text-white leading-tight">🎉 NexCart Installed!</p>
                <p className="text-[11px] mt-0.5 font-semibold" style={{ color: "rgba(134,239,172,0.95)" }}>
                  Opening app…
                </p>
              </>
            )}
          </div>

          {/* Action button */}
          <div className="flex-shrink-0 flex items-center gap-1.5">
            {phase === "prompt" && (
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-bold text-white transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
              >
                <Download className="w-3.5 h-3.5" />
                Install
              </button>
            )}

            {phase === "installing" && (
              <div className="rounded-xl px-3.5 py-2 text-[12px] font-bold" style={{ background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.40)" }}>
                Wait…
              </div>
            )}

            {phase === "done" && (
              <button
                onClick={handleOpenApp}
                className="rounded-xl px-3.5 py-2 text-[12px] font-bold text-white transition-all active:scale-95 flex items-center gap-1"
                style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
              >
                Open App
              </button>
            )}

            {phase !== "installing" && (
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "rgba(255,255,255,0.45)" }}
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
