"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import {
  ScanBarcode,
  ShieldCheck,
  BrainCircuit,
  Zap,
  ArrowRight,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { blurFadeUp, staggerContainer } from "@/lib/motion";

interface Step {
  number: string;
  icon: LucideIcon;
  title: string;
  tagline: string;
  description: string;
  accent: "cyan" | "blue" | "purple";
  tags: string[];
}

const ACCENT_HEX = { blue: "#60A5FA", cyan: "#22D3EE", purple: "#A78BFA" } as const;

const STEPS: Step[] = [
  {
    number: "01",
    icon: ScanBarcode,
    title: "Optical & AI Ingest",
    tagline: "Instant catalog synchronization",
    description:
      "Decode Indian EAN-13 barcodes in sub-seconds against local databases, parse supplier invoice PDFs, or snap packaging photos with Groq AI fallback.",
    accent: "cyan",
    tags: ["EAN-13 & GS1 India", "Invoice OCR", "Camera Fallback"],
  },
  {
    number: "02",
    icon: ShieldCheck,
    title: "Real-Time FIFO Guard",
    tagline: "Dynamic freshness tracking",
    description:
      "Every batch is logged with time-stamped manufacture & expiry windows. Automated freshness scoring prioritizes front-shelf rotation before stock spoils.",
    accent: "blue",
    tags: ["Batch Expiry Tracking", "Zero-Waste Rotation", "Freshness Index"],
  },
  {
    number: "03",
    icon: BrainCircuit,
    title: "Predictive Demand AI",
    tagline: "Groq neural forecasting",
    description:
      "Groq-powered models analyze velocity, regional retail spikes (Diwali, weekends), and supplier lead times to accurately predict stock-out horizons.",
    accent: "purple",
    tags: ["99.4% Precision", "Festival Surge Alerts", "Stock-Out Horizons"],
  },
  {
    number: "04",
    icon: Zap,
    title: "Autonomous Restock",
    tagline: "Zero-touch requisition routing",
    description:
      "The instant stock breaches minimum safety buffers, one-click purchase orders are routed to verified FMCG distributors with live delivery tracking.",
    accent: "cyan",
    tags: ["Auto-PO Generation", "Distributor Sync", "Instant Webhooks"],
  },
];

export default function Workflow({ id }: { id?: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start 85%", "end 60%"],
  });
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section id={id} className="relative scroll-mt-24 px-6 py-28 md:px-10 md:py-36">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={blurFadeUp}
          className="mx-auto max-w-2xl text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#22D3EE]/30 bg-[#22D3EE]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#22D3EE]">
            <Sparkles size={12} />
            <span>Autonomous Pipeline</span>
          </div>
          <h2 className="mt-4 text-[32px] font-extrabold tracking-tight text-white sm:text-[40px] md:text-[46px]">
            How Inventra Operates
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-white/60 md:text-[17px]">
            From the camera scanner to autonomous distributor restock — a four-stage closed loop.
          </p>
        </motion.div>

        <div ref={trackRef} className="relative mt-20">
          {/* Connector track across the tops of cards on desktop */}
          <div className="pointer-events-none absolute left-12 right-12 top-10 hidden h-[2px] bg-white/10 lg:block" />
          <motion.div
            style={{ scaleX: lineScale }}
            className="pointer-events-none absolute left-12 right-12 top-10 hidden h-[2px] origin-left bg-gradient-to-r from-[#22D3EE] via-[#60A5FA] to-[#A78BFA] lg:block"
          />

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={staggerContainer(0.12)}
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
          >
            {STEPS.map((step, i) => {
              const hex = ACCENT_HEX[step.accent];
              return (
                <motion.div
                  key={step.title}
                  variants={blurFadeUp}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.015] p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-white/20 hover:shadow-2xl"
                  style={{
                    boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)",
                  }}
                >
                  {/* Subtle top glow line */}
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-[2px] opacity-60 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${hex}, transparent)`,
                    }}
                  />

                  <div>
                    {/* Header: Stage Number & Icon */}
                    <div className="flex items-center justify-between">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl border backdrop-blur-md transition-transform duration-300 group-hover:scale-105"
                        style={{
                          borderColor: `${hex}40`,
                          background: `${hex}15`,
                          color: hex,
                          boxShadow: `0 0 20px -4px ${hex}40`,
                        }}
                      >
                        <step.icon size={22} strokeWidth={1.8} />
                      </div>

                      <span
                        className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold"
                        style={{
                          borderColor: `${hex}40`,
                          background: "#16181F",
                          color: hex,
                        }}
                      >
                        STAGE {step.number}
                      </span>
                    </div>

                    <div className="mt-5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                        {step.tagline}
                      </span>
                      <h3 className="mt-1 text-[18px] font-bold text-white group-hover:text-white">
                        {step.title}
                      </h3>
                      <p className="mt-2.5 text-[13.5px] leading-relaxed text-white/60">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Micro-tags / pills */}
                  <div className="mt-6 border-t border-white/10 pt-4">
                    <div className="flex flex-wrap gap-1.5">
                      {step.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-white/70"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}