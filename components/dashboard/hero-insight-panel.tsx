"use client";

import { motion } from "framer-motion";
import { Sparkles, TrendingDown, TrendingUp, ShieldCheck, Gauge } from "lucide-react";
import { aiSummary, inventoryHealthScore } from "@/lib/mock-data";

// The freshness spectrum — green (safe) through amber (watch) to red (act now) —
// is the one signature motif reused across the hero ring, KPI accents, and
// expiry-severity bars elsewhere on the dashboard.
const SPECTRUM = "conic-gradient(from 200deg, #22C55E 0deg, #22C55E 190deg, #F59E0B 230deg, #EF4444 270deg, #EF4444 360deg)";

function formatINR(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function HeroInsightPanel() {
  const score = inventoryHealthScore;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative overflow-hidden rounded-xl2 border border-border bg-surface p-6 shadow-card md:p-8"
    >
      {/* ambient AI glow, quiet and confined to the corner */}
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-[0.15] blur-3xl"
        style={{ background: "radial-gradient(circle, #8B5CF6 0%, transparent 70%)" }}
      />
      <div className="grid-texture pointer-events-none absolute inset-0 opacity-[0.4] [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      <div className="relative flex flex-col gap-8 md:flex-row md:items-center">
        {/* Freshness ring */}
        <div className="flex shrink-0 items-center gap-5">
          <div className="relative flex h-32 w-32 items-center justify-center shrink-0">
            <div className="absolute inset-0 rounded-full" style={{ background: SPECTRUM }} />
            <div className="absolute inset-[6px] rounded-full bg-surface" />
            <div className="relative flex flex-col items-center">
              <span className="font-display text-3xl font-semibold tracking-tight">{score}</span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted">Health Score</span>
            </div>
          </div>
          <div className="md:hidden">
            <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <Sparkles size={13} /> AI Insight
            </p>
          </div>
        </div>

        {/* Recommendation copy */}
        <div className="min-w-0 flex-1">
          <p className="hidden items-center gap-1.5 text-xs font-medium text-primary md:flex">
            <Sparkles size={13} /> AI Insight · updated 2 min ago
          </p>
          <h2 className="mt-1.5 font-display text-lg font-semibold leading-snug md:text-xl">
            {aiSummary.recommendation}
          </h2>
          <div className="mt-4 flex items-center gap-1.5">
            <Gauge size={13} className="text-muted" />
            <span className="text-xs text-muted">AI confidence</span>
            <div className="ml-1 h-1.5 w-24 overflow-hidden rounded-full bg-surface2">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${aiSummary.confidence}%` }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              />
            </div>
            <span className="text-xs font-medium text-text">{aiSummary.confidence}%</span>
          </div>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-3 gap-4 border-t border-border pt-5 md:w-[380px] md:border-l md:border-t-0 md:pl-6 md:pt-0">
          <div>
            <p className="flex items-center gap-1 text-[11px] font-medium text-muted">
              <TrendingDown size={12} className="text-out" /> At Risk
            </p>
            <p className="mt-1 font-display text-xl font-semibold">{aiSummary.productsAtRisk}</p>
            <p className="text-[11px] text-muted">products</p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-[11px] font-medium text-muted">
              <ShieldCheck size={12} className="text-low" /> Est. Waste
            </p>
            <p className="mt-1 font-display text-xl font-semibold">{formatINR(aiSummary.estimatedWaste)}</p>
            <p className="text-[11px] text-muted">this month</p>
          </div>
          <div>
            <p className="flex items-center gap-1 text-[11px] font-medium text-muted">
              <TrendingUp size={12} className="text-healthy" /> Money Saved
            </p>
            <p className="mt-1 font-display text-xl font-semibold text-healthy">{formatINR(aiSummary.moneySaved)}</p>
            <p className="text-[11px] text-muted">last 30 days</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
