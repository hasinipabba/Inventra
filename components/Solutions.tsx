"use client";

import { motion } from "framer-motion";
import {
  ShieldCheck,
  PackageCheck,
  Zap,
  LineChart,
  Workflow as WorkflowIcon,
  type LucideIcon,
} from "lucide-react";
import { blurFadeUp } from "@/lib/motion";

interface Solution {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: "blue" | "cyan" | "purple";
}

const ACCENT_HEX = { blue: "#60A5FA", cyan: "#22D3EE", purple: "#A78BFA" } as const;

const SOLUTIONS: Solution[] = [
  { icon: ShieldCheck, title: "Reduce Inventory Waste", description: "Prevent expiry through AI-powered monitoring.", accent: "blue" },
  { icon: PackageCheck, title: "Never Run Out of Stock", description: "Receive intelligent low-stock alerts.", accent: "cyan" },
  { icon: Zap, title: "Faster Inventory Management", description: "Scan products instantly using Barcode and OCR.", accent: "purple" },
  { icon: LineChart, title: "AI Business Insights", description: "Predict demand and optimize purchasing.", accent: "blue" },
  { icon: WorkflowIcon, title: "Intelligent Automation", description: "Automate repetitive inventory tasks and notifications.", accent: "cyan" },
];

export default function Solutions({ id }: { id?: string }) {
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
            Solutions
          </span>
          <h2 className="mt-4 text-[32px] font-extrabold tracking-tight text-white sm:text-[40px] md:text-[46px]">
            Smart Solutions for Modern Businesses
          </h2>
        </motion.div>

        <div className="mt-20 flex flex-col gap-20 md:gap-28">
          {SOLUTIONS.map((solution, i) => {
            const reversed = i % 2 === 1;
            const hex = ACCENT_HEX[solution.accent];
            return (
              <div
                key={solution.title}
                className={`flex flex-col items-center gap-10 md:gap-16 ${
                  reversed ? "md:flex-row-reverse" : "md:flex-row"
                }`}
              >
                <motion.div
                  initial={{ opacity: 0, x: reversed ? 32 : -32, filter: "blur(6px)" }}
                  whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
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
                  <h3 className="mt-5 text-[24px] font-bold tracking-tight text-white md:text-[28px]">
                    {solution.title}
                  </h3>
                  <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/55 md:text-[16px]">
                    {solution.description}
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: reversed ? -32 : 32, filter: "blur(6px)" }}
                  whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -4 }}
                  className="flex flex-1 items-center justify-center"
                >
                  <div
                    className="flex aspect-[4/3] w-full max-w-md items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] backdrop-blur-xl transition-shadow duration-500"
                    style={{ boxShadow: `0 24px 60px -30px rgba(0,0,0,0.6)` }}
                  >
                    <div
                      className="flex h-20 w-20 items-center justify-center rounded-2xl border"
                      style={{ color: hex, borderColor: `${hex}40`, background: `${hex}1a`, boxShadow: `0 0 30px -6px ${hex}66` }}
                    >
                      <solution.icon size={36} strokeWidth={1.5} />
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}