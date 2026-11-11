"use client";

import { useEffect, useRef } from "react";

export function ScrollProgressBar() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    let raf: number;

    const update = () => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const pct = total > 0 ? Math.min(scrolled / total, 1) : 0;
      bar.style.transform = `scaleX(${pct})`;
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update(); // set initial position
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "3px",
        zIndex: 99999,
        background: "rgba(255,255,255,0.06)",
        pointerEvents: "none",
      }}
    >
      <div
        ref={barRef}
        style={{
          height: "100%",
          width: "100%",
          transformOrigin: "left",
          transform: "scaleX(0)",
          background: "linear-gradient(90deg, #6366f1, #3b82f6, #06b6d4, #10b981)",
          boxShadow: "0 0 8px rgba(99,102,241,0.7), 0 0 18px rgba(6,182,212,0.4)",
          borderRadius: "0 2px 2px 0",
        }}
      />
    </div>
  );
}
