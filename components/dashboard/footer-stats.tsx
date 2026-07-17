"use client";

import { motion } from "framer-motion";
import { footerStats } from "@/lib/mock-data";

const ITEMS = [
  { label: "Today's Scans", value: footerStats.todaysScans.toLocaleString("en-IN") },
  { label: "Products Saved", value: footerStats.productsSaved.toLocaleString("en-IN") },
  { label: "Waste Prevented", value: `₹${footerStats.wastePrevented.toLocaleString("en-IN")}` },
  { label: "Revenue Saved", value: `₹${footerStats.revenueSaved.toLocaleString("en-IN")}` },
  { label: "AI Accuracy", value: `${footerStats.aiAccuracy}%` },
];

export function FooterStats() {
  return (
    <div className="grid grid-cols-2 gap-4 rounded-xl2 border border-border bg-surface p-5 sm:grid-cols-5">
      {ITEMS.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
          className="text-center"
        >
          <p className="font-display text-lg font-semibold tracking-tight sm:text-xl">{item.value}</p>
          <p className="mt-0.5 text-[11px] text-muted">{item.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
