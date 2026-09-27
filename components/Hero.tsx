"use client";

import { motion, type Variants } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowRight, ScanBarcode, Sparkles, CheckCircle2, Zap, ShieldCheck } from "lucide-react";

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.15,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function Hero() {
  const router = useRouter();

  return (
    <section className="relative z-10 flex min-h-screen w-full items-center px-6 pt-24 pb-16 md:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-12 lg:flex-row lg:items-center">
        {/* Left Column: Heading, Copy, Dual CTAs, Trust Pills */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex w-full flex-col items-center text-center lg:max-w-[620px] lg:items-start lg:text-left"
        >
          {/* Top Badge */}
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 rounded-full border border-[#60A5FA]/30 bg-[#60A5FA]/10 px-3.5 py-1.5 text-xs font-semibold text-[#93C5FD] backdrop-blur-md">
            <Sparkles size={13} className="text-[#60A5FA]" />
            <span>Autonomous Retail & Warehouse Intelligence</span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="mt-5 text-[36px] font-extrabold leading-[1.08] tracking-tight text-white sm:text-[46px] md:text-[54px] lg:text-[60px]"
          >
            AI-Powered Inventory <span className="bg-gradient-to-r from-[#60A5FA] via-[#22D3EE] to-[#A78BFA] bg-clip-text text-transparent">Intelligence</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mt-5 max-w-[560px] text-[15.5px] leading-[1.65] text-white/80 sm:text-[17px]"
          >
            Instant EAN-13 barcode decoding, automated expiry prevention, and Groq-powered demand forecasting built for modern retail.
          </motion.p>

          {/* Dual CTAs */}
          <motion.div variants={itemVariants} className="mt-8 flex w-full flex-col gap-3.5 sm:w-auto sm:flex-row sm:items-center">
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-[14px] border border-[#60A5FA]/40 bg-[#60A5FA] px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_0_28px_rgba(96,165,250,0.4)] transition-all duration-300 ease-out hover:scale-[1.03] hover:bg-[#3B82F6] active:scale-[0.98]"
            >
              <span>Explore Live Demo</span>
              <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
            </button>

            <button
              onClick={() => router.push("/admin/scan")}
              className="flex items-center justify-center gap-2 rounded-[14px] border border-white/20 bg-white/10 px-6 py-3.5 text-[15px] font-semibold text-white backdrop-blur-md transition-all duration-300 hover:border-white/30 hover:bg-white/[0.16] active:scale-[0.98]"
            >
              <ScanBarcode size={16} className="text-[#22D3EE]" />
              <span>Launch Scanner</span>
            </button>
          </motion.div>

          {/* Trust / Spec Pills */}
          <motion.div variants={itemVariants} className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/60 lg:justify-start">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 size={13} className="text-[#22C55E]" /> 99.4% Scan Accuracy
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Zap size={13} className="text-[#60A5FA]" /> 0ms Database Lookup
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck size={13} className="text-[#22D3EE]" /> Real-Time FIFO Tracking
            </span>
          </motion.div>
        </motion.div>

        {/* Right Column: Floating Interactive Glassmorphic HUD Preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[480px] lg:w-[460px]"
        >
          <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-[#1E2028]/90 to-[#121318]/90 p-5 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
            {/* Top Bar */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-[#22C55E] animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider text-white/90">Inventra Ingest Engine</span>
              </div>
              <span className="rounded-md border border-[#22D3EE]/30 bg-[#22D3EE]/10 px-2 py-0.5 text-[11px] font-semibold text-[#22D3EE]">
                LIVE MATCH
              </span>
            </div>

            {/* Product Card Inside HUD */}
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Britannia Good Day Butter Cookies</h4>
                  <p className="mt-0.5 text-[11.5px] text-white/60">EAN-13: 8901063012613 · 200g Pack</p>
                </div>
                <span className="rounded-md bg-[#22C55E]/15 px-2 py-0.5 text-[11px] font-bold text-[#22C55E]">
                  100% HEALTH
                </span>
              </div>

              {/* Specs Grid */}
              <div className="mt-3.5 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-center">
                <div className="rounded-lg bg-black/30 p-2">
                  <span className="block text-[10px] text-white/50">Stock</span>
                  <span className="text-xs font-bold text-white">100 pcs</span>
                </div>
                <div className="rounded-lg bg-black/30 p-2">
                  <span className="block text-[10px] text-white/50">MRP</span>
                  <span className="text-xs font-bold text-[#60A5FA]">₹35.00</span>
                </div>
                <div className="rounded-lg bg-black/30 p-2">
                  <span className="block text-[10px] text-white/50">Expiry</span>
                  <span className="text-xs font-bold text-[#22C55E]">Dec 2026</span>
                </div>
              </div>
            </div>

            {/* AI Insight Pill */}
            <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-[#A78BFA]/30 bg-[#A78BFA]/10 p-3 text-left">
              <Sparkles size={16} className="mt-0.5 shrink-0 text-[#C4B5FD]" />
              <div className="text-[12px] leading-snug text-white/90">
                <span className="font-semibold text-[#DDD6FE]">Groq Demand Forecast:</span> High Kirana tea-time turnover. Auto-reorder triggers when stock dips below 20 units.
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-4 flex items-center justify-between text-[11.5px] text-white/50">
              <span>Source: <strong className="text-white">Postgres DB (0ms)</strong></span>
              <span>Shelf: <strong className="text-white">A1-02 · Warehouse A</strong></span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}