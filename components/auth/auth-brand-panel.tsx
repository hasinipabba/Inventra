"use client";

import { motion } from "framer-motion";
import { ScanBarcode, ShieldCheck, TrendingUp } from "lucide-react";

// Signature illustration: a scan beam sweeping down a shelf of product
// batches, each tagged with a freshness color. This is the one visual idea
// unique to this page — grounded in what the app actually does (scan
// products, read expiry, flag risk) rather than a generic AI gradient blob.
const ROWS = [
  ["#22C55E", "#22C55E", "#F59E0B", "#22C55E", "#22C55E"],
  ["#22C55E", "#EF4444", "#22C55E", "#22C55E", "#F59E0B"],
  ["#F59E0B", "#22C55E", "#22C55E", "#EF4444", "#22C55E"],
  ["#22C55E", "#22C55E", "#F59E0B", "#22C55E", "#22C55E"],
  ["#22C55E", "#22C55E", "#22C55E", "#22C55E", "#F59E0B"],
];

export function AuthBrandPanel({ tagline }: { tagline: string }) {
  return (
    <div className="relative hidden h-full flex-col justify-between overflow-hidden bg-[#080C16] p-10 lg:flex">
      <div className="grid-texture pointer-events-none absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(circle_at_30%_20%,black,transparent_70%)]" />
      <div
        className="pointer-events-none absolute -left-32 top-1/3 h-96 w-96 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #8B5CF6 0%, transparent 70%)" }}
      />

      <div className="relative flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <ScanBarcode size={18} />
        </span>
        <span className="font-display text-lg font-semibold tracking-tight text-white">Inventra</span>
      </div>

      <div className="relative">
        <h1 className="max-w-sm font-display text-3xl font-semibold leading-tight text-white">{tagline}</h1>

        {/* Shelf + scan beam illustration */}
        <div className="relative mt-10 w-full max-w-sm overflow-hidden rounded-xl2 border border-white/10 bg-white/[0.03] p-5">
          <div className="space-y-2.5">
            {ROWS.map((row, r) => (
              <div key={r} className="flex gap-2.5">
                {row.map((color, c) => (
                  <span
                    key={c}
                    className="h-6 flex-1 rounded-[3px]"
                    style={{ background: `${color}33`, border: `1px solid ${color}88` }}
                  />
                ))}
              </div>
            ))}
          </div>
          <motion.div
            className="pointer-events-none absolute inset-x-0 h-16"
            style={{ background: "linear-gradient(to bottom, transparent, rgba(59,130,246,0.35), transparent)" }}
            initial={{ top: "-20%" }}
            animate={{ top: ["-20%", "110%"] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="mt-6 flex gap-6 text-sm text-white/70">
          <p className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-healthy" /> 94% AI accuracy
          </p>
          <p className="flex items-center gap-1.5">
            <TrendingUp size={14} className="text-primary" /> ₹2.1L waste saved/mo
          </p>
        </div>
      </div>

      <p className="relative text-xs text-white/40">© 2026 Inventra. Intelligent Inventory. Smarter Business.</p>
    </div>
  );
}
