import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        surface2: "rgb(var(--surface-2) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        text: "rgb(var(--text) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--primary-fg) / <alpha-value>)",
        },
        healthy: "#22C55E",
        low: "#F59E0B",
        out: "#EF4444",
        expiring: "#F59E0B",
        expired: "#EF4444",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgb(0 0 0 / 0.04), 0 1px 1px rgb(0 0 0 / 0.03)",
        popover: "0 12px 32px -8px rgb(0 0 0 / 0.18)",
      },
      borderRadius: {
        xl2: "0.875rem",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      keyframes: {
        "fade-in": { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        pulse2: { "0%,100%": { opacity: "1" }, "50%": { opacity: ".55" } },
        wiggle: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(-12deg)" },
          "75%": { transform: "rotate(12deg)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out both",
        pulse2: "pulse2 1.8s ease-in-out infinite",
        wiggle: "wiggle 0.4s ease-in-out",
      },
    },
  },
  plugins: [],
};
export default config;
