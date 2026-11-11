"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export const AtmosphericBackground = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Server renders a plain dark bg — no framer-motion, no Math.random() → no hydration mismatch
  if (!mounted) {
    return <div className="fixed inset-0 -z-10 bg-[#080c16]" />;
  }

  const particles = Array.from({ length: 20 }, (_, i) => ({
    x: Math.random() * 100 + "vw",
    y: Math.random() * 100 + "vh",
    dy: Math.random() * -50 - 20 + "px",
    duration: Math.random() * 4 + 6,
    delay: Math.random() * 5,
    id: i,
  }));

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#080c16]">
      {/* Primary Aura */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-[10%] left-[10%] h-[70%] w-[70%] rounded-full bg-radial from-[#312e81]/40 to-transparent blur-[140px]"
      />

      {/* Secondary Pulse */}
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[5%] right-[5%] h-[60%] w-[60%] rounded-full bg-radial from-[#1e1b4b]/40 to-transparent blur-[160px]"
      />

      {/* Floating Particles */}
      <div className="absolute inset-0 z-0">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ x: p.x, y: p.y, opacity: 0 }}
            animate={{ y: [null, p.dy], opacity: [0, 0.4, 0] }}
            transition={{ duration: p.duration, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
            className="absolute h-px w-px bg-[#5e5cee]/60 rounded-full shadow-[0_0_10px_rgba(94,92,238,0.4)]"
          />
        ))}
      </div>

      {/* Deep Center Vibe */}
      <motion.div
        animate={{ opacity: [0.3, 0.4, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-radial from-[#5e5cee]/10 via-transparent to-transparent opacity-40"
      />

      {/* Grain Overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};
