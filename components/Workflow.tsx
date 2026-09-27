"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import {
  PackagePlus,
  ScanBarcode,
  ScanText,
  BrainCircuit,
  TrendingUp,
  AlertTriangle,
  BellRing,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";
import { blurFadeUp, staggerContainer } from "@/lib/motion";

interface Step {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: "blue" | "cyan" | "purple";
}

const ACCENT_HEX = { blue: "#60A5FA", cyan: "#22D3EE", purple: "#A78BFA" } as const;

const STEPS: Step[] = [
  { icon: PackagePlus, title: "Product Entry", description: "Add a product, manually or in bulk.", accent: "blue" },
  { icon: ScanBarcode, title: "Barcode / QR Scan", description: "Identify items instantly via camera.", accent: "cyan" },
  { icon: ScanText, title: "OCR Invoice Processing", description: "Pull data straight from invoices.", accent: "purple" },
  { icon: BrainCircuit, title: "AI Stock Analysis", description: "Movement is analyzed against history.", accent: "blue" },
  { icon: TrendingUp, title: "Demand Prediction", description: "Future demand is forecast per SKU.", accent: "cyan" },
  { icon: AlertTriangle, title: "Expiry & Low Stock", description: "At-risk items are flagged early.", accent: "purple" },
  { icon: BellRing, title: "Auto Notifications", description: "The right people get alerted.", accent: "blue" },
  { icon: LayoutDashboard, title: "Inventory Dashboard", description: "Everything in one live view.", accent: "cyan" },
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
          <span className="text-[12px] font-medium uppercase tracking-[0.2em] text-[#22D3EE]">
            Pipeline
          </span>
          <h2 className="mt-4 text-[32px] font-extrabold tracking-tight text-white sm:text-[40px] md:text-[46px]">
            How Inventra Works
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-white/55 md:text-[17px]">
            From the first scan to the final alert — one connected, automated
            pipeline.
          </p>
        </motion.div>

        <div ref={trackRef} className="relative mt-20">
          {/* connector track (static, dim) */}
          <div className="pointer-events-none absolute left-7 right-7 top-7 hidden h-px bg-white/10 lg:block" />
          <div className="pointer-events-none absolute bottom-0 left-7 top-0 w-px bg-white/10 lg:hidden" />

          {/* connector fill (animates in on scroll) */}
          <motion.div
            style={{ scaleX: lineScale }}
            className="pointer-events-none absolute left-7 right-7 top-7 hidden h-px origin-left bg-gradient-to-r from-[#60A5FA] via-[#22D3EE] to-[#A78BFA] lg:block"
          />
          <motion.div
            style={{ scaleY: lineScale }}
            className="pointer-events-none absolute bottom-0 left-7 top-0 w-px origin-top bg-gradient-to-b from-[#60A5FA] via-[#22D3EE] to-[#A78BFA] lg:hidden"
          />

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={staggerContainer(0.08)}
            className="flex flex-col gap-6 lg:flex-row lg:flex-nowrap lg:justify-between lg:gap-3"
          >
            {STEPS.map((step, i) => {
              const hex = ACCENT_HEX[step.accent];
              return (
                <motion.div
                  key={step.title}
                  variants={blurFadeUp}
                  className="relative z-10 flex items-start gap-4 lg:w-[150px] lg:flex-col lg:items-center lg:text-center"
                >
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{
                      duration: 4 + (i % 3),
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.2,
                    }}
                    className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border backdrop-blur-xl"
                    style={{
                      borderColor: `${hex}40`,
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01))",
                      boxShadow: `0 0 22px -6px ${hex}66`,
                      color: hex,
                    }}
                  >
                    <step.icon size={22} strokeWidth={1.75} />
                    <span
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold"
                      style={{
                        borderColor: `${hex}55`,
                        background: "#1D2026",
                        color: hex,
                      }}
                    >
                      {i + 1}
                    </span>
                  </motion.div>
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 backdrop-blur-md lg:mt-1 lg:border-none lg:bg-transparent lg:px-0 lg:py-0">
                    <h3 className="text-[14px] font-semibold text-white">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-white/45">
                      {step.description}
                    </p>
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