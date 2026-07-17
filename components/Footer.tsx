"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Github, Linkedin, Mail } from "lucide-react";
import { blurFadeUp } from "@/lib/motion";

const QUICK_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Workflow", href: "#workflow" },
  { label: "Solutions", href: "#solutions" },
  { label: "Contact", href: "#contact" },
  { label: "Login", href: "/login" },
];

const SOCIALS = [
  { icon: Github, href: "https://github.com", label: "GitHub" },
  { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
  { icon: Mail, href: "mailto:hello@inventra.app", label: "Email" },
];

export default function Footer() {
  const scrollToSection = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith("#")) return;
    e.preventDefault();
    const el = document.getElementById(href.replace("#", ""));
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <footer className="relative overflow-hidden px-6 pb-10 pt-20 md:px-10">
      {/* top hairline with a soft blue glow centered on it */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-24 w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-[80px]"
        style={{ background: "#60A5FA" }}
      />

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        variants={blurFadeUp}
        className="relative mx-auto max-w-7xl"
      >
        <div className="flex flex-col items-center gap-10 text-center md:flex-row md:items-start md:justify-between md:text-left">
          {/* Brand */}
          <div className="max-w-xs">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01))",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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
            <p className="mt-3 text-[13px] leading-relaxed text-white/40">
              AI-powered inventory intelligence for teams that can't afford to
              guess.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/30">
              Navigate
            </p>
            <ul className="mt-4 flex flex-col items-center gap-3 md:items-start">
              {QUICK_LINKS.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith("#") ? (
                    <a
                      href={link.href}
                      onClick={(e) => scrollToSection(e, link.href)}
                      className="text-[13.5px] font-medium text-white/55 transition-colors duration-200 hover:text-white"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-[13.5px] font-medium text-white/55 transition-colors duration-200 hover:text-white"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Socials */}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/30">
              Connect
            </p>
            <div className="mt-4 flex items-center justify-center gap-3 md:justify-start">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/60 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-[#60A5FA]/40 hover:text-[#60A5FA] hover:shadow-[0_0_22px_-6px_rgba(96,165,250,0.6)]"
                >
                  <social.icon size={16} strokeWidth={1.75} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center gap-2 border-t border-white/5 pt-7 text-center md:flex-row md:justify-between md:text-left">
          <p className="text-[12px] text-white/35">
            © {new Date().getFullYear()} Inventra. All rights reserved.
          </p>
          <p className="text-[12px] text-white/35">
            Made with ❤️ for smarter inventory management.
          </p>
        </div>
      </motion.div>
    </footer>
  );
}