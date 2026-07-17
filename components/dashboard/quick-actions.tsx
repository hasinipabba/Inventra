"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ScanBarcode, PackagePlus, UploadCloud, FileBarChart, Sparkles, Boxes } from "lucide-react";

const ACTIONS = [
  { label: "Scan Product", icon: ScanBarcode, href: "/scan", accent: "text-primary bg-primary/10" },
  { label: "Add Product", icon: PackagePlus, href: "/products", accent: "text-healthy bg-healthy/10" },
  { label: "Upload CSV", icon: UploadCloud, href: "/products", accent: "text-low bg-low/10" },
  { label: "Generate Report", icon: FileBarChart, href: "/reports", accent: "text-primary bg-primary/10" },
  { label: "AI Prediction", icon: Sparkles, href: "/ai-insights", accent: "text-[#8B5CF6] bg-[#8B5CF6]/10" },
  { label: "Inventory", icon: Boxes, href: "/products", accent: "text-expiring bg-expiring/10" },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {ACTIONS.map((action, i) => (
        <motion.div
          key={action.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.04 }}
          whileHover={{ y: -2 }}
        >
          <Link
            href={action.href}
            className="flex h-24 flex-col items-center justify-center gap-2 rounded-xl2 border border-border bg-surface p-3 text-center transition-shadow hover:shadow-popover"
          >
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${action.accent}`}>
              <action.icon size={17} />
            </span>
            <span className="text-xs font-medium leading-tight">{action.label}</span>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
