"use client";

import { motion } from "framer-motion";
import { Sparkles, Wallet, Target } from "lucide-react";
import { aiPrediction } from "@/lib/mock-data";

export function AIPredictionWidget() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-xl2 border border-[#8B5CF6]/25 bg-gradient-to-br from-[#8B5CF6]/[0.07] to-transparent p-5"
    >
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 font-display text-sm font-semibold">
          <Sparkles size={14} className="text-[#8B5CF6]" /> Next-Week Expiry Prediction
        </p>
        <span className="flex items-center gap-1 rounded-full bg-[#8B5CF6]/10 px-2.5 py-1 text-[11px] font-semibold text-[#8B5CF6]">
          <Target size={11} /> {aiPrediction.confidence}% confidence
        </span>
      </div>

      <h3 className="mt-3 text-base font-semibold leading-snug">{aiPrediction.headline}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">{aiPrediction.reasoning}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-[11px] font-medium text-muted">Suggested action</p>
          <p className="mt-1 text-xs leading-relaxed">{aiPrediction.suggestedAction}</p>
        </div>
        <div className="flex flex-col justify-center rounded-lg border border-border bg-surface p-3">
          <p className="flex items-center gap-1 text-[11px] font-medium text-muted">
            <Wallet size={12} /> Estimated savings if actioned
          </p>
          <p className="mt-1 font-display text-xl font-semibold text-healthy">
            ₹{aiPrediction.estimatedSavings.toLocaleString("en-IN")}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
