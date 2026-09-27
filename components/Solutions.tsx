"use client";

import { motion } from "framer-motion";
import {
  ShieldCheck,
  PackageCheck,
  Zap,
  LineChart,
  Workflow as WorkflowIcon,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  BellRing,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { blurFadeUp } from "@/lib/motion";

interface Solution {
  icon: LucideIcon;
  tag: string;
  title: string;
  description: string;
  accent: "blue" | "cyan" | "purple";
  renderVisual: () => JSX.Element;
}

const ACCENT_HEX = { blue: "#60A5FA", cyan: "#22D3EE", purple: "#A78BFA" } as const;

export default function Solutions({ id }: { id?: string }) {
  const solutions: Solution[] = [
    {
      icon: ShieldCheck,
      tag: "Expiry Prevention",
      title: "Reduce Inventory Waste & Spoilage",
      description:
        "Every batch is tracked with real-time FIFO logic. When products approach their expiry window, Inventra alerts your floor managers and highlights front-shelf rotation before stock goes to waste.",
      accent: "blue",
      renderVisual: () => (
        <div className="w-full space-y-3 rounded-2xl border border-white/10 bg-gradient-to-b from-[#1C1D24] to-[#121318] p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#F59E0B] animate-pulse" />
              <span className="text-xs font-semibold text-white/80">Batch Expiry Sentinel</span>
            </div>
            <span className="rounded-md border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-2 py-0.5 text-[11px] font-bold text-[#F59E0B]">
              EXPIRING SOON
            </span>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
            <div className="flex items-start justify-between">
              <div>
                <h5 className="text-sm font-bold text-white">Amul Pasteurised Butter 100g</h5>
                <p className="text-[11.5px] text-white/50">Batch B-AMUL-100 · Warehouse A · Shelf D1</p>
              </div>
              <span className="text-xs font-bold text-[#F59E0B]">18 Days Left</span>
            </div>

            {/* Health Meter */}
            <div className="mt-3">
              <div className="flex justify-between text-[11px] text-white/60">
                <span>Freshness Health Score</span>
                <span className="font-semibold text-[#F59E0B]">45%</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[45%] rounded-full bg-gradient-to-r from-[#EF4444] to-[#F59E0B]" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-[#60A5FA]/10 p-2.5 text-xs text-[#93C5FD]">
            <Clock size={14} className="shrink-0 text-[#60A5FA]" />
            <span>FIFO Action: Shelf front-placement prioritized for clearance.</span>
          </div>
        </div>
      ),
    },
    {
      icon: PackageCheck,
      tag: "Stock Resilience",
      title: "Never Run Out of Fast-Moving Stock",
      description:
        "Define minimum and maximum stock thresholds for each SKU. The instant Kirana or grocery demand pulls inventory below your safe baseline, automated purchase requisitions are instantly routed to suppliers.",
      accent: "cyan",
      renderVisual: () => (
        <div className="w-full space-y-3 rounded-2xl border border-white/10 bg-gradient-to-b from-[#1C1D24] to-[#121318] p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#EF4444] animate-pulse" />
              <span className="text-xs font-semibold text-white/80">Stock Threshold Trigger</span>
            </div>
            <span className="rounded-md border border-[#EF4444]/30 bg-[#EF4444]/10 px-2 py-0.5 text-[11px] font-bold text-[#EF4444]">
              LOW STOCK (24%)
            </span>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
            <div className="flex items-start justify-between">
              <div>
                <h5 className="text-sm font-bold text-white">Maggi 2-Minute Masala Noodles</h5>
                <p className="text-[11.5px] text-white/50">SKU-MAGGI-70G · Threshold: 50 pcs</p>
              </div>
              <span className="text-xs font-bold text-[#EF4444]">12 left</span>
            </div>

            <div className="mt-3">
              <div className="flex justify-between text-[11px] text-white/60">
                <span>Depletion Level</span>
                <span className="font-semibold text-white">12 / 50 min units</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[24%] rounded-full bg-[#EF4444]" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-[#22D3EE]/20 bg-[#22D3EE]/10 p-2.5 text-xs text-[#A5F3FC]">
            <span className="font-semibold">Auto-PO #REQ-1049 generated</span>
            <span className="text-white/70">Supplier: ITC Foods</span>
          </div>
        </div>
      ),
    },
    {
      icon: Zap,
      tag: "Frictionless Ingest",
      title: "Sub-Second Barcode & Packaging OCR",
      description:
        "Point any smartphone camera, tablet, or handheld scanner at retail packaging. Inventra instantly decodes EAN-13 barcodes in 0ms against our pre-seeded Indian FMCG catalog, with continuous Groq AI fallback for damaged labels.",
      accent: "purple",
      renderVisual: () => (
        <div className="w-full space-y-3 rounded-2xl border border-white/10 bg-gradient-to-b from-[#1C1D24] to-[#121318] p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#22C55E]" />
              <span className="text-xs font-semibold text-white/80">Optical Ingest HUD</span>
            </div>
            <span className="rounded-md border border-[#A78BFA]/30 bg-[#A78BFA]/10 px-2 py-0.5 text-[11px] font-bold text-[#C4B5FD]">
              0ms DECODED
            </span>
          </div>

          {/* Simulated Scanner Viewfinder */}
          <div className="relative flex flex-col items-center justify-center rounded-xl border border-dashed border-[#A78BFA]/40 bg-black/40 py-5 text-center">
            <div className="h-10 w-44 rounded border border-[#22C55E]/60 bg-[#22C55E]/10 flex items-center justify-center font-mono text-xs tracking-widest text-[#22C55E] shadow-[0_0_15px_rgba(34,197,94,0.3)]">
              ||||| 8901063012613 |||||
            </div>
            <p className="mt-2 text-[11px] text-white/60">Good Day Butter Cookies 200g (Britannia)</p>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-[#A78BFA]/15 p-2.5 text-xs text-[#DDD6FE]">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 size={13} className="text-[#22C55E]" /> Database Match Confirmed
            </span>
            <span>Confidence: <strong>100%</strong></span>
          </div>
        </div>
      ),
    },
    {
      icon: LineChart,
      tag: "Machine Forecasting",
      title: "Predictive AI Demand Insights",
      description:
        "Stop reacting to empty shelves. Inventra correlates multi-month sales history, seasonality spikes (festivals, weekends, rains), and regional supplier lead times to project exact replenishment curves.",
      accent: "blue",
      renderVisual: () => (
        <div className="w-full space-y-3 rounded-2xl border border-white/10 bg-gradient-to-b from-[#1C1D24] to-[#121318] p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-[#60A5FA]" />
              <span className="text-xs font-semibold text-white/80">Surge Projection Model</span>
            </div>
            <span className="rounded-md border border-[#60A5FA]/30 bg-[#60A5FA]/10 px-2 py-0.5 text-[11px] font-bold text-[#60A5FA]">
              +28% SURGE
            </span>
          </div>

          {/* Mini Chart Graphic */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
            <div className="flex justify-between text-xs">
              <span className="text-white/60">Category: Biscuits & Packaged Foods</span>
              <span className="font-bold text-[#22C55E]">High Velocity</span>
            </div>
            <div className="mt-3 flex items-end gap-1.5 h-16 pt-2">
              {[35, 42, 40, 55, 62, 78, 95].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t ${
                      i >= 5 ? "bg-gradient-to-t from-[#60A5FA] to-[#22D3EE]" : "bg-white/15"
                    }`}
                    style={{ height: `${h}%` }}
                  />
                  <span className="text-[9px] text-white/40">{["M", "T", "W", "T", "F", "S", "S"][i]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-[#60A5FA]/10 p-2.5 text-xs text-[#93C5FD]">
            <Sparkles size={14} className="shrink-0 text-[#60A5FA]" />
            <span>AI Advice: Transfer 150 units from Pune hub before Friday evening surge.</span>
          </div>
        </div>
      ),
    },
    {
      icon: WorkflowIcon,
      tag: "Multi-Warehouse Control",
      title: "Autonomous Restock & Task Delegation",
      description:
        "Transform alerts into real floor actions. Inventra creates warehouse worker tasks, issues transfer manifests between hubs, and synchronizes real-time status with zero administrative overhead.",
      accent: "cyan",
      renderVisual: () => (
        <div className="w-full space-y-3 rounded-2xl border border-white/10 bg-gradient-to-b from-[#1C1D24] to-[#121318] p-5 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <BellRing size={14} className="text-[#22D3EE]" />
              <span className="text-xs font-semibold text-white/80">Dispatch Notification Feed</span>
            </div>
            <span className="rounded-md border border-[#22D3EE]/30 bg-[#22D3EE]/10 px-2 py-0.5 text-[11px] font-bold text-[#22D3EE]">
              INSTANT DISPATCH
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] p-2.5 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} className="text-[#22C55E]" />
                <span className="text-white font-medium">Task: Shelf Re-stock A1</span>
              </div>
              <span className="text-white/50">Assigned: Arjun V.</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] p-2.5 text-xs">
              <div className="flex items-center gap-2">
                <AlertTriangle size={13} className="text-[#F59E0B]" />
                <span className="text-white font-medium">Auto-PO Approved (Tata Salt)</span>
              </div>
              <span className="text-white/50">PO-489 · ₹4,200</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-white/50 pt-1">
            <span>Channels: <strong className="text-white">Email · SMS · In-App</strong></span>
            <span>Sync: <strong className="text-[#22C55E]">Real-Time</strong></span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id={id} className="relative scroll-mt-24 px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={blurFadeUp}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="text-[12px] font-medium uppercase tracking-[0.2em] text-[#60A5FA]">
            Capabilities
          </span>
          <h2 className="mt-3 text-[32px] font-extrabold tracking-tight text-white sm:text-[40px] md:text-[46px]">
            Engineered for High-Velocity Inventory
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-white/60">
            Real enterprise intelligence that eliminates stockouts, halts product expiry, and automates daily floor operations.
          </p>
        </motion.div>

        <div className="mt-20 flex flex-col gap-24 md:gap-32">
          {solutions.map((solution, i) => {
            const reversed = i % 2 === 1;
            const hex = ACCENT_HEX[solution.accent];
            return (
              <div
                key={solution.title}
                className={`flex flex-col items-center gap-12 md:gap-16 ${
                  reversed ? "md:flex-row-reverse" : "md:flex-row"
                }`}
              >
                {/* Left/Right Text Content */}
                <motion.div
                  initial={{ opacity: 0, x: reversed ? 32 : -32 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-1 text-center md:text-left"
                >
                  <span
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border"
                    style={{ color: hex, borderColor: `${hex}40`, background: `${hex}1a` }}
                  >
                    <solution.icon size={20} strokeWidth={1.75} />
                  </span>

                  <span className="block mt-4 text-xs font-bold uppercase tracking-wider text-white/40">
                    {solution.tag}
                  </span>

                  <h3 className="mt-1 text-[24px] font-bold tracking-tight text-white md:text-[28px]">
                    {solution.title}
                  </h3>
                  <p className="mt-3.5 max-w-md text-[15px] leading-relaxed text-white/60 md:text-[16px]">
                    {solution.description}
                  </p>
                </motion.div>

                {/* Left/Right Rich UI Visual (No More Empty Box!) */}
                <motion.div
                  initial={{ opacity: 0, x: reversed ? -32 : 32 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-1 items-center justify-center w-full max-w-md"
                >
                  {solution.renderVisual()}
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}