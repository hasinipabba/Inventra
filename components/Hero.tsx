"use client";

import { motion, type Variants } from "framer-motion";
import { useRouter } from "next/navigation";

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function Hero() {
  const router = useRouter();

  return (
    <section className="relative z-10 flex h-screen w-full items-center px-6 md:px-10">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex w-full flex-col items-center text-center md:w-auto md:max-w-[650px] md:items-start md:text-left"
      >
        <motion.h1
          variants={itemVariants}
          className="max-w-[650px] text-[38px] font-extrabold leading-[1.08] tracking-tight text-white sm:text-[48px] md:text-[58px] lg:text-[64px]"
        >
          AI-Powered Inventory Intelligence
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="mt-6 max-w-[600px] text-[16px] leading-[1.6] text-white/85 sm:text-[17px] md:text-[18px]"
        >
          Automate stock tracking, predict demand, and eliminate expiry risks
          with advanced AI insights.
        </motion.p>

        <motion.div variants={itemVariants} className="mt-9 w-full sm:w-auto">
          <button
            onClick={() => router.push("/login")}
            className="group relative w-full overflow-hidden rounded-[14px] border border-white/20 bg-white/10 px-8 py-3.5 text-[15px] font-semibold text-white backdrop-blur-md transition-all duration-300 ease-out hover:scale-[1.03] hover:border-white/30 hover:bg-white/[0.15] active:scale-[0.98] sm:w-auto"
            style={{
              boxShadow:
                "0 8px 24px -8px rgba(0,0,0,0.5), 0 0 0 0 rgba(96,165,250,0)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow =
                "0 8px 28px -6px rgba(0,0,0,0.55), 0 0 28px 4px rgba(96,165,250,0.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow =
                "0 8px 24px -8px rgba(0,0,0,0.5), 0 0 0 0 rgba(96,165,250,0)";
            }}
          >
            <span className="relative z-10">Get Started</span>
            {/* subtle sheen sweep on hover */}
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}