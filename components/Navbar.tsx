"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Workflow", href: "#workflow" },
  { label: "Solutions", href: "#solutions" },
  { label: "Contact", href: "#contact" },
];

const NAV_HEIGHT = 88; // px — used to offset smooth-scroll targets under the fixed navbar

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToSection = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileOpen(false);
    const id = href.replace("#", "");
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - NAV_HEIGHT;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={`fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 transition-all duration-300 md:px-10 ${
        scrolled
          ? "border-b border-white/10 bg-[#0a0b0d]/75 py-4 backdrop-blur-xl md:py-5"
          : "border-b border-transparent bg-transparent py-6 md:py-8"
      }`}
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

      {/* Desktop links */}
      <nav className="flex items-center gap-1 md:gap-2">
        <ul className="hidden items-center gap-8 pr-6 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                onClick={(e) => scrollToSection(e, link.href)}
                className="text-[13.5px] font-medium text-white/70 transition-colors duration-200 hover:text-white"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <Link
          href="/login"
          className="hidden rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-[13.5px] font-medium text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/[0.12] md:inline-block"
        >
          Login
        </Link>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white backdrop-blur-sm md:hidden"
        >
          {mobileOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </nav>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute inset-x-4 top-full mt-2 flex flex-col gap-1 rounded-2xl border border-white/10 bg-[#0a0b0d]/90 p-3 backdrop-blur-xl md:hidden"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => scrollToSection(e, link.href)}
                className="rounded-xl px-4 py-2.5 text-[14px] font-medium text-white/80 transition-colors duration-200 hover:bg-white/[0.06] hover:text-white"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="mt-1 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-center text-[14px] font-medium text-white"
            >
              Login
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}