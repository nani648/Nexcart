"use client";

/**
 * Renders a seller's chosen "Scrolling Design" (see lib/scrolling-designs.ts)
 * as particles that burst out in response to how the shopper is actually
 * browsing — mouse movement on desktop, scrolling/touch on mobile — rather
 * than a fixed animation that just loops on its own. Two modes:
 *
 *  - "interactive" (default, used on the real storefront): listens on
 *    `window` for mousemove/scroll/touchmove while mounted, and spawns
 *    particles at the cursor position (mouse) or at a random spot near the
 *    top of the viewport (scroll/touch, which carries no cursor position).
 *    Rendered with `position: fixed` so it covers the whole visible page,
 *    not just the banner box it's mounted inside.
 *
 *  - "demo" (used for the small preview boxes on the seller's Scrolling
 *    Design picker page): there's no real page to scroll there, so it
 *    self-triggers bursts on an interval, positioned as percentages inside
 *    its own (already `position: relative`) container instead of the
 *    viewport.
 *
 * Particles are only ever added client-side after mount (never during the
 * initial render), so there is no SSR/hydration mismatch risk — the very
 * first render (server AND client) always has zero particles.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { getScrollingDesign } from "@/lib/scrolling-designs";

interface Particle {
  id: number;
  x: number; // px (interactive) or % (demo)
  y: number; // px (interactive) or % (demo)
  size: number;
  duration: number; // seconds
  dx: number; // px, horizontal drift
  dy: number; // px, vertical drift
  rot: number; // deg
  color: string;
}

const MAX_PARTICLES = 40;
const MOUSE_THROTTLE_MS = 90;
const SCROLL_THROTTLE_MS = 160;
const DEMO_INTERVAL_MS = 550;

interface ScrollingDesignOverlayProps {
  /** The seller's stored scrollingDesign setting — renders nothing if
   * missing, disabled, or an unrecognized effect key. */
  design?: { enabled?: boolean; effect?: string | null } | null;
  mode?: "interactive" | "demo";
}

export function ScrollingDesignOverlay({ design, mode = "interactive" }: ScrollingDesignOverlayProps) {
  const config = design?.enabled ? getScrollingDesign(design.effect) : null;
  const [particles, setParticles] = useState<Particle[]>([]);
  const nextId = useRef(0);
  const mountedRef = useRef(true);
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const spawn = useCallback(
    (x: number, y: number, count: number) => {
      if (!config) return;
      const newOnes: Particle[] = [];
      for (let i = 0; i < count; i++) {
        nextId.current += 1;
        const id = nextId.current;
        const size = config.minSize + Math.random() * (config.maxSize - config.minSize);
        // Shorter, snappier durations for a burst-on-interaction feel —
        // the ambient min/max on the config describe a slow drift, which
        // reads as sluggish for something meant to react instantly.
        const duration = 0.8 + Math.random() * 0.8;
        const spread = mode === "demo" ? 14 : 26;
        const travel = mode === "demo" ? 26 : 70;
        const vertical = config.direction === "up" ? -1 : config.direction === "down" ? 1 : 0;
        newOnes.push({
          id,
          x: x + (Math.random() - 0.5) * spread,
          y: y + (Math.random() - 0.5) * spread,
          size,
          duration,
          dx: (Math.random() - 0.5) * (mode === "demo" ? 10 : 26),
          dy: vertical * (travel * 0.5 + Math.random() * travel * 0.5),
          rot: config.rotate ? (Math.random() - 0.5) * 300 : 0,
          color: config.colors[id % config.colors.length],
        });

        const t = setTimeout(() => {
          timeoutsRef.current.delete(t);
          if (!mountedRef.current) return;
          setParticles((prev) => prev.filter((p) => p.id !== id));
        }, duration * 1000 + 120);
        timeoutsRef.current.add(t);
      }
      setParticles((prev) => [...prev, ...newOnes].slice(-MAX_PARTICLES));
    },
    [config, mode]
  );

  // Interactive mode: react to real mouse/scroll/touch on the page.
  useEffect(() => {
    if (!config || mode !== "interactive") return;
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let lastMove = 0;
    const onMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastMove < MOUSE_THROTTLE_MS) return;
      lastMove = now;
      spawn(e.clientX, e.clientY, 1);
    };

    // Touch: spawn AT THE FINGER'S ACTUAL POSITION, same as the mouse does
    // above — this is the important fix. The previous version ignored the
    // touch's real coordinates entirely and spawned particles at random
    // spots on the screen, so tracing a shape with your finger (like a "C")
    // looked completely disconnected from where you were actually touching.
    // Using e.touches[0].clientX/clientY makes the particle trail follow the
    // finger precisely, matching how mousemove already behaves on desktop.
    let lastTouch = 0;
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const now = performance.now();
      if (now - lastTouch < MOUSE_THROTTLE_MS) return;
      lastTouch = now;
      spawn(touch.clientX, touch.clientY, 1);
    };
    // Fires immediately the instant a finger touches down, so there's no
    // lag before the first particle appears.
    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      spawn(touch.clientX, touch.clientY, 2);
    };

    // Separate, lower-key trigger for page scrolling itself (e.g. momentum
    // scroll continuing after the finger lifts, or scrolling via a
    // scrollbar) — sampled every animation frame instead of relying on the
    // browser's `scroll` event, since some mobile browsers fire it sparsely
    // (or not at all) during fast-flick momentum scrolling.
    let lastY = window.scrollY;
    let lastSpawnAt = 0;
    let rafId: number;
    const tick = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) > 4) {
        lastY = y;
        const now = performance.now();
        if (now - lastSpawnAt >= SCROLL_THROTTLE_MS) {
          lastSpawnAt = now;
          const x = Math.random() * window.innerWidth;
          const sy = window.innerHeight * (0.12 + Math.random() * 0.35);
          spawn(x, sy, 1);
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [config, mode, spawn]);

  // Demo mode: self-playing preview, no real page to react to.
  useEffect(() => {
    if (!config || mode !== "demo") return;
    const id = setInterval(() => {
      spawn(10 + Math.random() * 80, 10 + Math.random() * 80, 1);
    }, DEMO_INTERVAL_MS);
    return () => clearInterval(id);
  }, [config, mode, spawn]);

  // Cleanup on unmount — stop any pending "remove this particle" timers so
  // they never call setParticles after the component is gone.
  useEffect(() => {
    mountedRef.current = true;
    const timeouts = timeoutsRef.current;
    return () => {
      mountedRef.current = false;
      timeouts.forEach(clearTimeout);
      timeouts.clear();
    };
  }, []);

  if (!config) return null;

  const posUnit = mode === "demo" ? "%" : "px";

  return (
    <>
      <style>{`
        @keyframes nxc-sd-burst {
          0% { transform: translate(0,0) scale(0.4) rotate(0deg); opacity: 0; }
          18% { opacity: var(--nxc-sd-op, 0.9); transform: translate(0,0) scale(1) rotate(0deg); }
          100% { transform: translate(var(--nxc-sd-dx,0px), var(--nxc-sd-dy,-50px)) scale(var(--nxc-sd-scale-end,0.75)) rotate(var(--nxc-sd-rot,0deg)); opacity: 0; }
        }
      `}</style>

      <div
        className={mode === "interactive" ? "fixed inset-0 overflow-hidden pointer-events-none" : "absolute inset-0 overflow-hidden pointer-events-none"}
        style={{ zIndex: mode === "interactive" ? 60 : 2 }}
        aria-hidden="true"
      >
        {particles.map((p) => {
          const baseStyle: React.CSSProperties = {
            position: "absolute",
            left: `${p.x}${posUnit}`,
            top: `${p.y}${posUnit}`,
            animation: `nxc-sd-burst ${p.duration.toFixed(2)}s ease-out forwards`,
            ["--nxc-sd-op" as string]: 0.65 + Math.random() * 0.3,
            ["--nxc-sd-dx" as string]: `${p.dx.toFixed(0)}px`,
            ["--nxc-sd-dy" as string]: `${p.dy.toFixed(0)}px`,
            ["--nxc-sd-rot" as string]: `${p.rot.toFixed(0)}deg`,
            ["--nxc-sd-scale-end" as string]: "0.7",
          };

          if (config.shape === "glyph") {
            return (
              <span key={p.id} style={{ ...baseStyle, fontSize: `${p.size}px`, color: p.color, lineHeight: 1 }}>
                {config.glyph}
              </span>
            );
          }

          if (config.shape === "circle") {
            return (
              <div
                key={p.id}
                style={{
                  ...baseStyle,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  borderRadius: "50%",
                  background: p.color,
                  boxShadow: config.glow ? `0 0 ${p.size * 1.8}px ${p.size * 0.6}px ${p.color}` : undefined,
                }}
              />
            );
          }

          if (config.shape === "rect") {
            return (
              <div
                key={p.id}
                style={{ ...baseStyle, width: `${p.size}px`, height: `${p.size * 0.5}px`, background: p.color, borderRadius: "1px" }}
              />
            );
          }

          // "line" — thin streaks (Shimmer Rain)
          return (
            <div
              key={p.id}
              style={{
                ...baseStyle,
                width: "2px",
                height: `${p.size}px`,
                background: `linear-gradient(to bottom, transparent, ${p.color}, transparent)`,
                transform: "rotate(12deg)",
              }}
            />
          );
        })}
      </div>
    </>
  );
}
