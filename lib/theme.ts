import type { Variants } from "framer-motion";

/** Blur + fade + rise — the default reveal for headings, cards, rows. */
export const blurFadeUp: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  },
};

/** Springy pop-in — used for icons, badges, counters. */
export const springPop: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 140, damping: 15 },
  },
};

/** Stagger wrapper for grids/lists of children using blurFadeUp/springPop. */
export function staggerContainer(stagger = 0.12, delay = 0): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren: delay },
    },
  };
}

/** Slow, ambient float — for background glow orbs and floating icons. */
export const floatY = {
  animate: {
    y: [0, -16, 0],
    transition: { duration: 7, repeat: Infinity, ease: "easeInOut" },
  },
};

/** Subtle infinite glow pulse for accent elements. */
export const glowPulse = {
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: { duration: 3.2, repeat: Infinity, ease: "easeInOut" },
  },
};