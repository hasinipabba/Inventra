"use client";

import { motion } from "framer-motion";
import {
  BrainCircuit,
  ScanBarcode,
  ScanText,
  CalendarClock,
  PackageSearch,
  BarChart3,
  ShoppingCart,
  BellRing,
  type LucideIcon,
} from "lucide-react";
import MagneticWrap from "./MagneticWrap";
import { blurFadeUp, staggerContainer } from "@/lib/motion";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: "blue" | "cyan" | "purple";
}

const ACCENT_STYLES = {
  blue: {
    icon: "text-[#60A5FA] border-[#60A5FA]/25 bg-[#60A5FA]/10",
    glow: "rgba(96,165,250,0.4)",
  },
  cyan: {
    icon: "text-[#22D3EE] border-[#22D3EE]/25 bg-[#22D3EE]/10",
    glow: "rgba(34,211,238,0.35)",
  },
  purple: {
    icon: "text-[#A78BFA] border-[#A78BFA]/25 bg-[#A78BFA]/10",
    glow: "rgba(167,139,250,0.35)",
  },
} as const;

const FEATURES: Feature[] = [
  {
    icon: BrainCircuit,
    title: "AI Demand Prediction",
    description:
      "Forecast future stock needs from historical sales patterns and seasonal trends.",
    accent: "blue",
  },
  {
    icon: ScanBarcode,
    title: "Barcode & QR Code Scanner",
    description:
      "Scan products in seconds with a live camera feed — no manual entry required.",
    accent: "cyan",
  },
  {
    icon: ScanText,
    title: "OCR Invoice Scanner",
    description:
      "Extract line items and quantities from supplier invoices automatically.",
    accent: "purple",
  },
  {
    icon: CalendarClock,
    title: "Automated Expiry Detection",
    description:
      "Get flagged the moment stock approaches its expiry window, before it's wasted.",
    accent: "blue",
  },
  {
    icon: PackageSearch,
    title: "Low Stock Monitoring",
    description:
      "Continuous threshold tracking across every SKU, updated in real time.",
    accent: "cyan",
  },
  {
    icon: BarChart3,
    title: "Smart Inventory Analytics",
    description:
      "Turn raw stock movement into clear, actionable operational insight.",
    accent: "purple",
  },
  {
    icon: ShoppingCart,
    title: "Purchase Automation",
    description:
      "Auto-generate purchase requests the instant stock dips below target.",
    accent: "blue",
  },
  {
    icon: BellRing,
    title: "Real-Time Notifications",
    description: "Email and push alerts the moment something needs your attention.",
    accent: "cyan",
  },
];

export default function Features({ id }: { id?: string }) {
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
          <span className="text-[12px] font-medium uppercase tracking-[0.2em] text-[#60A5FA]">
            Capabilities
          </span>
          <h2 className="mt-4 text-[32px] font-extrabold tracking-tight text-white sm:text-[40px] md:text-[46px]">
            Powerful AI Inventory Features
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-white/55 md:text-[17px]">
            Everything you need to automate and optimize your inventory
            operations.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={staggerContainer(0.09)}
          className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {FEATURES.map((feature) => {
            const style = ACCENT_STYLES[feature.accent];
            return (
              <motion.div key={feature.title} variants={blurFadeUp}>
                <MagneticWrap strength={6} className="h-full">
                  <div
                    className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-6 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1.5"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = `0 20px 50px -20px rgba(0,0,0,0.6), 0 0 0 1px ${style.glow}, 0 0 34px -6px ${style.glow}`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {/* top sheen */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-transform duration-500 group-hover:scale-110 ${style.icon}`}
                    >
                      <feature.icon size={20} strokeWidth={1.75} />
                    </div>
                    <h3 className="mt-5 text-[15.5px] font-semibold tracking-tight text-white">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-white/50">
                      {feature.description}
                    </p>
                  </div>
                </MagneticWrap>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}