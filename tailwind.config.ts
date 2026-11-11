import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    // "src/lib" holds several registries (card-designs.ts, collection-
    // shapes.ts, …) whose values are Tailwind ARBITRARY-VALUE class strings
    // (e.g. "aspect-[80/81]", "[clip-path:polygon(...)]") read at runtime
    // and interpolated into a className elsewhere. Tailwind's JIT only
    // generates CSS for a class if the literal string is found while
    // scanning these content globs — it doesn't follow imports or execute
    // code. Without this line, any arbitrary-value class that ISN'T ALSO
    // coincidentally duplicated verbatim in a scanned component file
    // compiles to nothing, silently: the class renders in the DOM but no
    // matching CSS rule exists, so it has zero visual effect. That's exactly
    // what was happening to 3 of card-designs.ts's 4 mediaAspect tiers
    // (every one except "standard", which only worked by accident because
    // its value happens to also be hardcoded in ProductCard.tsx's `glassy`
    // fallback) until this line was added.
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", ...fontFamily.sans],
        mono: ["var(--font-geist-mono)", ...fontFamily.mono],
        // These now resolve to real, self-hosted fonts loaded in app/layout.tsx.
        // Before that they silently fell back to Geist Sans / Georgia.
        display: ["var(--font-space-grotesk)", "var(--font-geist-sans)", ...fontFamily.sans],
        serif: ["var(--font-playfair)", "Georgia", ...fontFamily.serif],
        script: ["var(--font-caveat)", "Segoe Script", "cursive"],
        // Second round of card-text fonts (lib/card-designs.ts CARD_FONTS).
        // Loaded in app/layout.tsx via next/font — same self-hosted pattern.
        poppins: ["var(--font-poppins)", ...fontFamily.sans],
        montserrat: ["var(--font-montserrat)", ...fontFamily.sans],
        bebas: ["var(--font-bebas)", ...fontFamily.sans],
        cormorant: ["var(--font-cormorant)", "Georgia", ...fontFamily.serif],
        nunito: ["var(--font-nunito)", ...fontFamily.sans],
        oswald: ["var(--font-oswald)", ...fontFamily.sans],
        quicksand: ["var(--font-quicksand)", ...fontFamily.sans],
        dmserif: ["var(--font-dmserif)", "Georgia", ...fontFamily.serif],
        outfit: ["var(--font-outfit)", ...fontFamily.sans],
        pacifico: ["var(--font-pacifico)", "cursive"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2.5xl": "1.125rem",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)",
        hover: "0 4px 24px rgba(0,0,0,0.13)",
        nav: "0 2px 16px rgba(0,0,0,0.09)",
      },
      fontSize: {
        "10": ["10px", "14px"],
        "11": ["11px", "15px"],
        "13": ["13px", "18px"],
      },
      letterSpacing: {
        tightest: "-0.08em",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
