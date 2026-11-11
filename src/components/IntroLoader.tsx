"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface IntroLoaderProps {
  onComplete: () => void;
  key?: string;
}

export const IntroLoader = ({ onComplete }: IntroLoaderProps) => {
  const [phase, setPhase] = useState<"initial" | "welcome" | "text" | "closing">("initial");

  useEffect(() => {
    let active = true;
    const sequence = async () => {
      await new Promise((r) => setTimeout(r, 400));
      if (!active) return;
      setPhase("welcome");
      await new Promise((r) => setTimeout(r, 1600));
      if (!active) return;
      setPhase("text");
      await new Promise((r) => setTimeout(r, 2600));
      if (!active) return;
      setPhase("closing");
      await new Promise((r) => setTimeout(r, 50));
      if (!active) return;
      onComplete();
    };
    sequence();
    return () => {
      active = false;
    };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{
        opacity: 0,
        y: -20,
        scale: 0.98,
        filter: "blur(12px)",
        transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#080c16] overflow-hidden"
    >
      {/* Dynamic Grid Background */}
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(#5e5cee 1px, transparent 1px), linear-gradient(90deg, #5e5cee 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }}
      />

      <div className="relative z-10 w-full max-w-5xl px-8 flex flex-col items-center">
        <AnimatePresence mode="wait">
          {phase === "welcome" && (
            <motion.div
              key="p1"
              initial={{ opacity: 0, letterSpacing: "-0.05em" }}
              animate={{ opacity: 1, letterSpacing: "0em" }}
              exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
              transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-col items-center gap-6"
            >
              <div className="overflow-hidden">
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1.2, delay: 0.8 }}
                  className="text-[#5e5cee]/40 text-[10px] md:text-xs uppercase font-bold tracking-[1.5em]"
                >
                  System Initialization
                </motion.span>
              </div>
              <div className="overflow-hidden px-4">
                <motion.h2
                  initial={{ y: "110%", skewY: 10 }}
                  animate={{ y: 0, skewY: 0 }}
                  transition={{ duration: 1.2, ease: [0.2, 1, 0.3, 1], delay: 0.2 }}
                  className="text-6xl sm:text-8xl md:text-[12rem] font-serif italic text-white leading-none tracking-tightest text-center"
                >
                  Welcome
                </motion.h2>
              </div>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.5, delay: 0.6, ease: "easeInOut" }}
                className="h-px bg-[#5e5cee]/20 max-w-[200px]"
              />
            </motion.div>
          )}

          {phase === "text" && (
            <motion.div
              key="p2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.02, transition: { duration: 0.8 } }}
              className="space-y-12 flex flex-col items-center"
            >
              <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 overflow-hidden py-4 px-8">
                <motion.h1
                  className="text-7xl sm:text-9xl md:text-[12rem] font-display font-bold tracking-tighter text-white leading-none flex"
                >
                  {"NexCart".split("").map((letter, i) => (
                    <motion.span
                      key={i}
                      initial={{ y: "120%", opacity: 0, filter: "blur(10px)" }}
                      animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                      transition={{
                        duration: 1.2,
                        ease: [0.23, 1, 0.32, 1],
                        delay: 0.05 + (0.04 * i)
                      }}
                      className={i >= 3 ? "text-[#5e5cee]" : ""}
                    >
                      {letter}
                    </motion.span>
                  ))}
                </motion.h1>

                <div className="flex flex-col items-center md:items-start overflow-hidden">
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 1.2, delay: 0.8, ease: [0.23, 1, 0.32, 1] }}
                    className="flex flex-col items-center md:items-start text-center md:text-left"
                  >
                    <span className="text-[#5e5cee] font-serif italic text-2xl sm:text-3xl md:text-4xl leading-none">
                      The Future of
                    </span>
                    <span className="text-white/40 text-[10px] md:text-sm uppercase tracking-[0.6em] font-bold mt-2 md:mt-3">
                      E-Commerce
                    </span>
                  </motion.div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-6 w-full">
                <motion.div
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ delay: 2, duration: 1.5, ease: "circOut" }}
                  className="h-px w-full max-w-[280px] md:w-[400px] bg-gradient-to-r from-transparent via-[#5e5cee]/50 to-transparent"
                />
                <motion.div
                  initial={{ opacity: 0, letterSpacing: "0.2em" }}
                  animate={{ opacity: 1, letterSpacing: "1em" }}
                  transition={{ delay: 1.8, duration: 2, ease: [0.23, 1, 0.32, 1] }}
                  className="text-[#5e5cee]/30 text-[8px] md:text-[10px] uppercase font-light text-center px-4"
                >
                  Digital Asset Infrastructure V.4.0
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Status Bar */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 5, ease: "linear" }}
        className="fixed bottom-0 left-0 right-0 h-1 bg-[#5e5cee]/20 origin-left"
      />

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onComplete()}
        className="fixed bottom-10 right-8 md:bottom-20 md:left-12 z-20 group flex items-center gap-4 cursor-pointer pointer-events-auto"
      >
        <div className="h-10 w-10 md:h-12 md:w-12 rounded-full border border-white/10 flex items-center justify-center group-hover:border-[#5e5cee] transition-colors">
          <div className="h-1 w-1 bg-white rounded-full group-hover:bg-[#5e5cee]" />
        </div>
        <span className="text-[9px] md:text-[10px] uppercase tracking-[0.4em] md:tracking-[0.5em] text-white/40 group-hover:text-white transition-colors">Skip Intro</span>
      </motion.button>
    </motion.div>
  );
};
