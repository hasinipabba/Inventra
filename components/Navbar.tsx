"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "About", href: "#about" },
];

export default function Navbar() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-6 md:px-10 md:py-8"
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 backdrop-blur-sm">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M8 1L14.5 4.75V11.25L8 15L1.5 11.25V4.75L8 1Z"
              stroke="#60A5FA"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <path
              d="M8 1V15M1.5 4.75L8 8M8 8L14.5 4.75M8 8V15"
              stroke="#60A5FA"
              strokeWidth="1"
              strokeOpacity="0.5"
            />
          </svg>
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-white">
          Inventra
        </span>
      </Link>

      {/* Right side links */}
      <nav className="flex items-center gap-1 md:gap-2">
        <ul className="hidden items-center gap-8 pr-6 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className="text-[13.5px] font-medium text-white/70 transition-colors duration-200 hover:text-white"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/login"
          className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-[13.5px] font-medium text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/[0.12]"
        >
          Login
        </Link>
      </nav>
    </motion.header>
  );
}