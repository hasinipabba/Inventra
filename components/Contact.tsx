"use client";

import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Github, Linkedin, type LucideIcon } from "lucide-react";

interface ContactInfo {
  icon: LucideIcon;
  label: string;
  value: string;
  href?: string;
}

const CONTACT_INFO: ContactInfo[] = [
  {
    icon: Mail,
    label: "Email",
    value: "hello@inventra.app",
    href: "mailto:hello@inventra.app",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+1 (555) 010-2938",
    href: "tel:+15550102938",
  },
  {
    icon: MapPin,
    label: "Office",
    value: "Remote-first, worldwide",
  },
];

const SOCIAL_LINKS = [
  { icon: Github, label: "GitHub", href: "https://github.com" },
  { icon: Linkedin, label: "LinkedIn", href: "https://linkedin.com" },
  { icon: Mail, label: "Email", href: "mailto:hello@inventra.app" },
];

export default function Contact({ id }: { id?: string }) {
  return (
    <section
      id={id}
      className="relative scroll-mt-24 px-6 py-24 md:px-10 md:py-32"
    >
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-[32px] font-extrabold tracking-tight text-white sm:text-[40px] md:text-[46px]">
            Get in Touch
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-white/60 md:text-[17px]">
            Questions about Inventra? Reach out — we're happy to help.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {CONTACT_INFO.map((item, i) => {
            const Wrapper = item.href ? "a" : "div";
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.08 }}
              >
                <Wrapper
                  {...(item.href ? { href: item.href } : {})}
                  className="group flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.03] p-7 text-center backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-blue-400/30 hover:bg-white/[0.06] hover:shadow-[0_0_32px_-8px_rgba(96,165,250,0.35)]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-400/10 text-blue-400">
                    <item.icon size={20} strokeWidth={1.75} />
                  </div>
                  <span className="mt-4 text-[12px] font-medium uppercase tracking-wide text-white/40">
                    {item.label}
                  </span>
                  <span className="mt-1 text-[14.5px] font-medium text-white">
                    {item.value}
                  </span>
                </Wrapper>
              </motion.div>
            );
          })}
        </div>

        {/* Social links */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          className="mt-10 flex items-center justify-center gap-4"
        >
          {SOCIAL_LINKS.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/70 backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-blue-400/30 hover:text-blue-400 hover:shadow-[0_0_24px_-6px_rgba(96,165,250,0.4)]"
            >
              <social.icon size={18} strokeWidth={1.75} />
            </a>
          ))}
        </motion.div>
      </div>
    </section>
  );
}