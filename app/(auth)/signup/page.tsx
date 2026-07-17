"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, ScanBarcode, Mail, Lock, User, ShieldCheck, Warehouse } from "lucide-react";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { PasswordStrength } from "@/components/auth/password-strength";
import { cn } from "@/lib/utils";

type Role = "Admin" | "Store Staff";

// This page calls the real /api/auth/signup route, which creates a user in
// lib/auth-store.ts (hashed password) and signs the same session cookie the
// login page uses.
export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<Role>("Store Staff");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Enter your full name.";
    if (!email) next.email = "Enter your work email.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Create a password.";
    else if (password.length < 8) next.password = "Use at least 8 characters.";
    if (confirm !== password) next.confirm = "Passwords don't match.";
    if (!agreed) next.agreed = "Accept the terms to continue.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors((prev) => ({ ...prev, form: "" }));
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors((prev) => ({ ...prev, form: data.error || "Something went wrong. Try again." }));
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setErrors((prev) => ({ ...prev, form: "Couldn't reach the server. Try again." }));
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthBrandPanel tagline="Every scan teaches the system something new." />

      <div className="flex items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ScanBarcode size={16} />
            </span>
            <span className="font-display text-base font-semibold">Inventra</span>
          </div>

          <h1 className="font-display text-2xl font-semibold tracking-tight">Create your account</h1>
          <p className="mt-1.5 text-sm text-muted">Set up access for your store or warehouse team.</p>

          {errors.form && (
            <p className="mt-3 rounded-lg border border-out/20 bg-out/[0.06] px-3 py-2 text-xs text-out">{errors.form}</p>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-xs font-medium text-muted">
                Full name
              </label>
              <div className="relative">
                <User size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ananya Sharma"
                  className="h-11 w-full rounded-lg border border-border bg-surface2 pl-9 pr-3 text-sm outline-none placeholder:text-muted focus:border-primary"
                />
              </div>
              {errors.name && <p className="mt-1 text-xs text-out">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-muted">
                Email
              </label>
              <div className="relative">
                <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="h-11 w-full rounded-lg border border-border bg-surface2 pl-9 pr-3 text-sm outline-none placeholder:text-muted focus:border-primary"
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-out">{errors.email}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-muted">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 w-full rounded-lg border border-border bg-surface2 pl-9 pr-9 text-sm outline-none placeholder:text-muted focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirm" className="mb-1.5 block text-xs font-medium text-muted">
                  Confirm
                </label>
                <input
                  id="confirm"
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 w-full rounded-lg border border-border bg-surface2 px-3 text-sm outline-none placeholder:text-muted focus:border-primary"
                />
              </div>
            </div>
            <PasswordStrength password={password} />
            {errors.password && <p className="text-xs text-out">{errors.password}</p>}
            {errors.confirm && <p className="text-xs text-out">{errors.confirm}</p>}

            <div>
              <p className="mb-1.5 text-xs font-medium text-muted">Role</p>
              <div className="grid grid-cols-2 gap-2.5">
                {([
                  { key: "Admin", icon: ShieldCheck, desc: "Full access" },
                  { key: "Store Staff", icon: Warehouse, desc: "Scan & update" },
                ] as const).map(({ key, icon: Icon, desc }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRole(key)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                      role === key ? "border-primary bg-primary/[0.06]" : "border-border bg-surface2 hover:bg-border/40"
                    )}
                  >
                    <Icon size={15} className={role === key ? "text-primary" : "text-muted"} />
                    <span className="text-xs font-medium">{key}</span>
                    <span className="text-[10px] text-muted">{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-start gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-border accent-[#3B82F6]"
                />
                I agree to the Terms of Service and Privacy Policy.
              </label>
              {errors.agreed && <p className="mt-1 text-xs text-out">{errors.agreed}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Creating account…
                </>
              ) : (
                "Create account"
              )}
            </button>

            <div className="relative py-1 text-center">
              <span className="relative z-10 bg-bg px-3 text-[11px] uppercase tracking-wide text-muted">or</span>
              <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-border" />
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/api/auth/google";
              }}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface text-sm font-medium hover:bg-surface2"
            >
              <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l6-6C34.5 6 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l6-6C34.5 6 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.4 26.8 36 24 36c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.3 5.3C40.7 36.5 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z" />
              </svg>
              Sign up with Google
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
