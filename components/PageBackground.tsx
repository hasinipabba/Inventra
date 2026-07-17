"use client";

import { useScroll, useTransform, motion } from "framer-motion";
import { useRef } from "react";

// Deterministic pseudo-random particle field (no Math.random — avoids
// server/client hydration mismatches while still looking organic).
const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 37) % 100,
  top: (i * 53) % 100,
  size: 2 + (i % 3),
  delay: (i % 6) * 0.6,
  duration: 6 + (i % 5),
}));

export default function PageBackground() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();

  const orbA = useTransform(scrollYProgress, [0, 1], [0, -180]);
  const orbB = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const orbC = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const sheenX = useTransform(scrollYProgress, [0, 1], ["-20%", "20%"]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#18191D]"
    >
      {/* Layered graphite base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 15% 0%, #23272F 0%, #1D2026 45%, #18191D 100%)",
        }}
      />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(#8FA3BF 1px, transparent 1px), linear-gradient(90deg, #8FA3BF 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* Glow orbs — parallax on scroll, gentle float on their own */}
      <motion.div
        style={{ y: orbA }}
        animate={{ y: [0, -16, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-32 top-[8%] h-[420px] w-[420px] rounded-full blur-[110px]"
      >
        <div
          className="h-full w-full rounded-full"
          style={{ background: "rgba(96,165,250,0.28)" }}
        />
      </motion.div>

      <motion.div
        style={{ y: orbB }}
        animate={{ y: [0, 20, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute right-[-10%] top-[35%] h-[520px] w-[520px] rounded-full blur-[130px]"
      >
        <div
          className="h-full w-full rounded-full"
          style={{ background: "rgba(34,211,238,0.18)" }}
        />
      </motion.div>

      <motion.div
        style={{ y: orbC }}
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute left-[20%] bottom-[5%] h-[460px] w-[460px] rounded-full blur-[120px]"
      >
        <div
          className="h-full w-full rounded-full"
          style={{ background: "rgba(167,139,250,0.16)" }}
        />
      </motion.div>

      {/* Metallic sheen sweep */}
      <motion.div
        style={{ x: sheenX }}
        className="absolute inset-y-0 left-0 w-[60%] opacity-[0.04] mix-blend-overlay"
        aria-hidden="true"
      >
        <div
          className="h-full w-full"
          style={{
            background:
              "linear-gradient(115deg, transparent 20%, #C7D2E0 45%, transparent 70%)",
          }}
        />
      </motion.div>

      {/* Drifting particle field */}
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-white/50"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            opacity: [0.15, 0.6, 0.15],
            y: [0, -18, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Vignette so section edges stay legible */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(80% 60% at 50% 0%, transparent 0%, rgba(24,25,29,0.4) 100%)",
        }}
      />
    </div>
  );
}